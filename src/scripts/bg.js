import { POEMS } from '../lib/poems.ts';

// 背景动态库：每套皮肤多种背景模式，可切换。按 data-skin + data-bg 决定渲染器。
(function () {
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, (window.innerWidth <= 768) ? 1.5 : 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (current && current.onResize) current.onResize();
    fx.init();
    readSettings();
  }

  function getPal() {
    const cs = getComputedStyle(document.documentElement);
    return {
      a: cs.getPropertyValue('--accent').trim() || '#5eead4',
      a2: cs.getPropertyValue('--accent-2').trim() || '#8b5cf6',
      bg: cs.getPropertyValue('--bg').trim() || '#070a16',
    };
  }
  let pal = getPal();

  // 全局指针状态（所有模式共享，仅绑定一次）
  const pointer = { x: -9999, y: -9999, active: false };
  // 交互开关：data-bg-force（repel/attract/auto/off）、data-bg-click（on/off）
  const settings = { force: 'repel', click: 'on' };
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  let lowPerf = false;
  function detectPerf() {
    const c = navigator.connection || {};
    if (c.saveData) lowPerf = true;            // 弱网/省流量
    if (isTouch && window.innerWidth <= 768) lowPerf = true; // 窄屏触摸设备
  }
  detectPerf();
  function readSettings() {
    const sf = localStorage.getItem('bg_force');
    const sc = localStorage.getItem('bg_click');
    const f = document.documentElement.getAttribute('data-bg-force') || sf || 'repel';
    settings.force = (f === 'off') ? 'off' : f;
    const c = document.documentElement.getAttribute('data-bg-click') || sc || 'on';
    settings.click = (c === 'off') ? 'off' : c;
    // 移动端/弱机降级：默认关力场与点击动效（用户显式开启则尊重）
    if (lowPerf) {
      if (!sf) settings.force = 'off';
      if (!sc) settings.click = 'off';
    }
  }
  // 低电量异步检测（不阻塞首帧），命中即降级并重新读取开关
  if (navigator.getBattery) {
    navigator.getBattery().then((b) => {
      const chk = () => {
        if (b.level < 0.2 && !b.charging) { lowPerf = true; readSettings(); }
      };
      chk();
      b.addEventListener('levelchange', chk);
      b.addEventListener('chargingchange', chk);
    }).catch(() => {});
  }

  function rgba(hex, al) {
    hex = (hex || '').trim();
    if (hex.startsWith('rgb')) {
      const m = hex.match(/[\d.]+/g);
      if (m && m.length >= 3) return `rgba(${m[0]},${m[1]},${m[2]},${al})`;
      return hex;
    }
    const s = hex.replace('#', '');
    let r, g, b;
    if (s.length === 3) { r = g = b = parseInt(s + s, 16); }
    else { r = parseInt(s.slice(0, 2), 16); g = parseInt(s.slice(2, 4), 16); b = parseInt(s.slice(4, 6), 16); }
    return `rgba(${r},${g},${b},${al})`;
  }

  function clear() { ctx.clearRect(0, 0, W, H); }

  /* ---------------- 各模式渲染器（返回 {frame(t,dt), onResize?}） ---------------- */

  function stars() {
    let arr = [];
    const N = Math.max(80, Math.round((W * H) / 5500));
    function init() {
      arr = [];
      for (let i = 0; i < N; i++)
        arr.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.4, tw: Math.random() * 6.28, sp: Math.random() * 0.0012 + 0.0004, c: Math.random() < 0.25 ? pal.a2 : pal.a });
    }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        // 纯静止闪烁：去除横向漂移，与 meteor/galaxy 区分
        for (const s of arr) {
          s.tw += dt * s.sp;
          const a = 0.35 + 0.6 * Math.sin(s.tw);
          // 外晕
          ctx.fillStyle = rgba(s.c, 0.08 * a);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.2, 0, 6.28); ctx.fill();
          // 实心
          ctx.fillStyle = rgba(s.c, 0.25 + a * 0.7);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
        }
      },
    };
  }

  function galaxy() {
    const base = stars();
    let arms = [];
    function init() {
      base.onResize();
      arms = [];
      const cx = W * 0.5, cy = H * 0.55;
      // 三条旋臂：每条用一串点沿螺旋分布
      for (let k = 0; k < 3; k++) {
        const pts = [];
        const R0 = 40 + Math.random() * 30;
        for (let i = 0; i < 90; i++) {
          const r = R0 + i * 3.2;
          const a = (k * (Math.PI * 2) / 3) + i * 0.18;
          pts.push({ r, a, size: Math.max(0.3, 2.4 - i * 0.02), al: 0.18 - i * 0.0018 });
        }
        arms.push({ cx, cy, pts });
      }
    }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        // 中心光晕
        const cx = W * 0.5, cy = H * 0.55;
        const spin = t * 0.00012;
        for (const arm of arms) {
          for (const p of arm.pts) {
            const a = p.a + spin;
            const x = arm.cx + Math.cos(a) * p.r;
            const y = arm.cy + Math.sin(a) * p.r * 0.55; // 压扁呈盘状
            ctx.fillStyle = rgba(pal.a, Math.max(0, p.al));
            ctx.beginPath(); ctx.arc(x, y, p.size, 0, 6.28); ctx.fill();
          }
        }
        // 中心核
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
        cg.addColorStop(0, rgba(pal.a2, 0.4)); cg.addColorStop(1, rgba(pal.a2, 0));
        ctx.fillStyle = cg; ctx.fillRect(cx - 80, cy - 80, 160, 160);
        // 底层静态星点
        base.frame(t, dt);
      },
    };
  }

  function meteor() {
    const base = stars();
    let ms = [];
    let acc = 0;
    return {
      onResize: base.onResize,
      frame(t, dt) {
        clear(); base.frame(t, dt);
        // 提高流星频率（0.9s→0.35s），允许更多并发
        acc += dt;
        if (acc > 350 && ms.length < 6) {
          acc = 0;
          const x = Math.random() * W * 0.85 + W * 0.1;
          const y = Math.random() * H * 0.45;
          ms.push({ x, y, vx: -(Math.random() * 6 + 6), vy: (Math.random() * 2.5 + 2.5), life: 1, w: 2 + Math.random() * 1.5 });
        }
        for (let i = ms.length - 1; i >= 0; i--) {
          const m = ms[i];
          m.x += m.vx; m.y += m.vy; m.life -= dt * 0.0009;
          if (m.life <= 0 || m.x < -80 || m.y > H + 80) { ms.splice(i, 1); continue; }
          const tx = m.x - m.vx * 8, ty = m.y - m.vy * 8;
          // 主光带
          const grd = ctx.createLinearGradient(m.x, m.y, tx, ty);
          grd.addColorStop(0, rgba(pal.a, Math.min(1, m.life * 1.2)));
          grd.addColorStop(0.5, rgba(pal.a, m.life * 0.4));
          grd.addColorStop(1, rgba(pal.a, 0));
          ctx.strokeStyle = grd; ctx.lineWidth = m.w;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
          // 头部亮点
          ctx.fillStyle = rgba('#ffffff', m.life * 0.9);
          ctx.beginPath(); ctx.arc(m.x, m.y, m.w * 0.8, 0, 6.28); ctx.fill();
        }
      },
    };
  }

  function pixel() {
    const cell = 14;
    let pts = [];
    function init() {
      pts = [];
      const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
      for (let i = 0; i < cols * rows; i++) {
        if (Math.random() < 0.1)
          pts.push({ gx: i % cols, gy: (i / cols) | 0, tw: Math.random() * 6.28, sp: Math.random() * 0.003 + 0.001, c: Math.random() < 0.3 ? pal.a2 : pal.a });
      }
    }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        for (const p of pts) {
          p.tw += dt * p.sp;
          const a = 0.3 + 0.5 * Math.sin(p.tw);
          ctx.fillStyle = rgba(p.c, a);
          const x = p.gx * cell + 2, y = p.gy * cell + 2;
          ctx.fillRect(x, y, cell - 4, cell - 4);
        }
      },
    };
  }

  function grid() {
    let scan = 0;
    return {
      frame(t, dt) {
        clear();
        const vp = { x: W / 2, y: H * 0.42 };
        ctx.strokeStyle = rgba(pal.a, 0.12); ctx.lineWidth = 1;
        // 纵向收敛线
        for (let i = -10; i <= 10; i++) {
          const x = W / 2 + i * (W / 12);
          ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(vp.x, vp.y); ctx.stroke();
        }
        // 横向透视滚动
        const scroll = (t * 0.00012) % 1;
        for (let i = 0; i < 14; i++) {
          const f = (i + scroll) / 14;
          const y = vp.y + (H - vp.y) * f * f;
          ctx.strokeStyle = rgba(pal.a, 0.05 + f * 0.12);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        // 扫描线
        scan = (scan + dt * 0.12) % H;
        const sg = ctx.createLinearGradient(0, scan - 60, 0, scan + 60);
        sg.addColorStop(0, rgba(pal.a, 0)); sg.addColorStop(0.5, rgba(pal.a, 0.18)); sg.addColorStop(1, rgba(pal.a, 0));
        ctx.fillStyle = sg; ctx.fillRect(0, scan - 60, W, 120);
      },
    };
  }

  function matrix() {
    const chars = '01ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎｱﾐﾑﾒﾓABCDEF0123456789';
    let cols, drops;
    const fs = 16;
    function init() {
      cols = Math.ceil(W / fs);
      drops = new Array(cols).fill(0).map(() => Math.random() * -H);
    }
    init();
    ctx.font = fs + "px monospace";
    return {
      onResize: init,
      frame(t, dt) {
        ctx.fillStyle = rgba(pal.bg, 0.12); ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < cols; i++) {
          const ch = chars[(Math.random() * chars.length) | 0];
          const x = i * fs, y = drops[i];
          ctx.fillStyle = rgba(pal.a, 0.9); ctx.fillText(ch, x, y);
          ctx.fillStyle = rgba(pal.a2, 0.5); ctx.fillText(chars[(Math.random() * chars.length) | 0], x, y - fs);
          drops[i] += dt * 0.06 + 1.2;
          if (drops[i] > H && Math.random() > 0.975) drops[i] = Math.random() * -100;
        }
      },
    };
  }

  function holo() {
    let rings = []; let acc = 0;
    return {
      frame(t, dt) {
        clear();
        const cx = W / 2, cy = H / 2;
        acc += dt;
        if (acc > 700) { acc = 0; rings.push({ r: 0, life: 1 }); }
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i];
          r.r += dt * 0.12; r.life -= dt * 0.0006;
          if (r.life <= 0) { rings.splice(i, 1); continue; }
          ctx.strokeStyle = rgba(pal.a, r.life * 0.5); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, r.r, 0, 6.28); ctx.stroke();
        }
        // 中心脉冲核
        const pr = 10 + 6 * Math.sin(t * 0.004);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr * 3);
        g.addColorStop(0, rgba(pal.a2, 0.5)); g.addColorStop(1, rgba(pal.a2, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, pr * 3, 0, 6.28); ctx.fill();
      },
    };
  }

  function circuit() {
    let segs = [];
    function init() {
      segs = [];
      const n = Math.round((W * H) / 40000);
      for (let i = 0; i < n; i++) {
        const horiz = Math.random() < 0.5;
        const x = Math.random() * W, y = Math.random() * H;
        const len = 40 + Math.random() * 120;
        segs.push({ horiz, x, y, len, dot: Math.random(), sp: Math.random() * 0.0008 + 0.0003 });
      }
    }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        ctx.strokeStyle = rgba(pal.a, 0.14); ctx.lineWidth = 1;
        for (const s of segs) {
          ctx.beginPath();
          if (s.horiz) { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.len, s.y); }
          else { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y + s.len); }
          ctx.stroke();
          // 流动点
          s.dot += dt * s.sp; if (s.dot > 1) s.dot -= 1;
          const dx = s.horiz ? s.x + s.len * s.dot : s.x;
          const dy = s.horiz ? s.y : s.y + s.len * s.dot;
          ctx.fillStyle = rgba(pal.a2, 0.9);
          ctx.beginPath(); ctx.arc(dx, dy, 2, 0, 6.28); ctx.fill();
        }
      },
    };
  }

  function qi() {
    let arr = [];
    function spawn() { return { x: Math.random() * W, y: H + 10, vy: -(Math.random() * 0.5 + 0.2), sway: Math.random() * 6.28, r: Math.random() * 2 + 1, life: 1 }; }
    function init() { arr = []; for (let i = 0; i < 60; i++) { const p = spawn(); p.y = Math.random() * H; arr.push(p); } }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        for (const p of arr) {
          p.y += p.vy; p.sway += dt * 0.002; p.x += Math.sin(p.sway) * 0.4; p.life -= dt * 0.0004;
          if (p.y < -10 || p.life <= 0) Object.assign(p, spawn());
          ctx.fillStyle = rgba(Math.random() < 0.5 ? pal.a : pal.a2, 0.15 + p.life * 0.4);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
        }
      },
    };
  }

  // 符文法阵（中国风）：外双环 + 八卦位 + 太极 + 旋转的符箓放射
  function rune() {
    const trigrams = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
    return {
      frame(t, dt) {
        clear();
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.3;
        ctx.save();
        ctx.translate(cx, cy);
        // 外双环
        ctx.strokeStyle = rgba(pal.a, 0.28); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.28); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 0.86, 0, 6.28); ctx.stroke();
        // 旋转内层：符箓放射（带折角，似雷符）+ 八卦字符环
        ctx.save();
        ctx.rotate(t * 0.00018);
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(pal.a2, 0.5); ctx.lineWidth = 1.2;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * 6.28;
          const x1 = Math.cos(a) * R * 0.46, y1 = Math.sin(a) * R * 0.46;
          const x2 = Math.cos(a) * R * 0.8, y2 = Math.sin(a) * R * 0.8;
          const mx = Math.cos(a + 0.14) * R * 0.63, my = Math.sin(a + 0.14) * R * 0.63;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.fillStyle = rgba(pal.a, 0.6);
        ctx.font = (R * 0.14) + 'px "Songti SC","STSong","SimSun",serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * 6.28 - Math.PI / 2;
          ctx.fillText(trigrams[i], Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93);
        }
        ctx.restore();
        // 中心太极（反向慢转）
        ctx.save();
        ctx.rotate(-t * 0.00022);
        const r = R * 0.27;
        ctx.fillStyle = rgba(pal.a, 0.55);
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
        ctx.arc(0, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2, true);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(pal.bg, 0.92);
        ctx.beginPath(); ctx.arc(0, -r / 2, r / 2, 0, 6.28); ctx.fill();
        ctx.fillStyle = rgba(pal.a, 0.55);
        ctx.beginPath(); ctx.arc(0, r / 2, r / 2, 0, 6.28); ctx.fill();
        ctx.fillStyle = rgba(pal.a, 0.95);
        ctx.beginPath(); ctx.arc(0, -r / 2, r * 0.13, 0, 6.28); ctx.fill();
        ctx.fillStyle = rgba(pal.bg, 0.92);
        ctx.beginPath(); ctx.arc(0, r / 2, r * 0.13, 0, 6.28); ctx.fill();
        ctx.restore();
        ctx.restore();
      },
    };
  }

  function lotus() {
    return {
      frame(t, dt) {
        clear();
        const cx = W / 2, cy = H * 0.62;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.0012);
        for (let layer = 0; layer < 3; layer++) {
          const R = (40 + layer * 36) * (0.8 + pulse * 0.4);
          ctx.strokeStyle = rgba(layer % 2 ? pal.a2 : pal.a, 0.4 - layer * 0.08);
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * 6.28 + layer * 0.3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6, cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.5);
            ctx.stroke();
          }
        }
      },
    };
  }

  function ink() {
    let blots = []; let acc = 0;
    function init() { blots = []; for (let i = 0; i < 4; i++) blots.push({ x: Math.random() * W, y: Math.random() * H, r: 20 + Math.random() * 40, life: Math.random() }); }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        acc += dt;
        for (const b of blots) {
          b.r += dt * 0.01; b.life -= dt * 0.0002;
          if (b.life <= 0 || b.r > Math.max(W, H)) { b.x = Math.random() * W; b.y = Math.random() * H; b.r = 10; b.life = 1; }
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, rgba(pal.a2, 0.1 * b.life)); g.addColorStop(1, rgba(pal.a2, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.fill();
        }
      },
    };
  }

  function landscape() {
    let off = 0;
    return {
      frame(t, dt) {
        clear();
        off = (off + dt * 0.02) % 200;
        const layers = [
          { c: pal.a2, amp: 50, base: H * 0.7, sp: 1, al: 0.16 },
          { c: pal.a, amp: 36, base: H * 0.82, sp: 1.8, al: 0.22 },
        ];
        for (const L of layers) {
          ctx.fillStyle = rgba(L.c, L.al);
          ctx.beginPath(); ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 10) {
            const y = L.base + Math.sin((x + off * L.sp) * 0.006) * L.amp + Math.sin((x + off * L.sp) * 0.013) * L.amp * 0.4;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        }
      },
    };
  }

  function petals() {
    let arr = [];
    function spawn() { return { x: Math.random() * W, y: -10, vy: Math.random() * 0.4 + 0.2, sway: Math.random() * 6.28, r: Math.random() * 4 + 3, rot: Math.random() * 6.28 }; }
    function init() { arr = []; for (let i = 0; i < 40; i++) { const p = spawn(); p.y = Math.random() * H; arr.push(p); } }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        for (const p of arr) {
          p.y += p.vy; p.sway += dt * 0.002; p.x += Math.sin(p.sway) * 0.6; p.rot += dt * 0.001;
          if (p.y > H + 10) Object.assign(p, spawn());
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = rgba(pal.a2, 0.5);
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, 6.28); ctx.fill();
          ctx.restore();
        }
      },
    };
  }

  function dust() {
    let arr = [];
    function init() { arr = []; const N = Math.round((W * H) / 16000); for (let i = 0; i < N; i++) arr.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1, r: Math.random() * 1.6 + 0.4 }); }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        for (const p of arr) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
          ctx.fillStyle = rgba(pal.a, 0.35);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
        }
      },
    };
  }

  function line() {
    let arr = [];
    function init() { arr = []; const N = Math.max(30, Math.round((W * H) / 26000)); for (let i = 0; i < N; i++) arr.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 }); }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        for (const p of arr) { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0; }
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const dx = arr[i].x - arr[j].x, dy = arr[i].y - arr[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 14000) {
              const a = (1 - d2 / 14000) * 0.3;
              ctx.strokeStyle = rgba(pal.a, a); ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(arr[i].x, arr[i].y); ctx.lineTo(arr[j].x, arr[j].y); ctx.stroke();
            }
          }
          ctx.fillStyle = rgba(pal.a, 0.7);
          ctx.beginPath(); ctx.arc(arr[i].x, arr[i].y, 1.6, 0, 6.28); ctx.fill();
        }
      },
    };
  }

  /* ---------------- 新增：星座 / 点墨 / 毛笔 / 文字 / 悬浮 ---------------- */

  // 星座连线：主星成组，连成星座图形，缓慢漂移 + 呼吸闪烁
  function constellation() {
    let groups = [];
    function init() {
      groups = [];
      const G = Math.max(3, Math.round((W * H) / 240000));
      for (let g = 0; g < G; g++) {
        const n = 4 + Math.floor(Math.random() * 4);
        const pts = [];
        for (let i = 0; i < n; i++)
          pts.push({
            ox: (Math.random() - 0.5) * 230,
            oy: (Math.random() - 0.5) * 170,
            r: Math.random() * 1.6 + 1.2,
            ph: Math.random() * 6.28,
          });
        groups.push({
          cx: Math.random() * W,
          cy: Math.random() * H,
          pts,
          vx: (Math.random() - 0.5) * 0.03,
          vy: (Math.random() - 0.5) * 0.02,
        });
      }
    }
    init();
    return {
      frame(t, dt) {
        clear();
        for (const g of groups) {
          g.cx += g.vx * dt;
          g.cy += g.vy * dt;
          if (g.cx < -260) g.cx = W + 260;
          if (g.cx > W + 260) g.cx = -260;
          if (g.cy < -260) g.cy = H + 260;
          if (g.cy > H + 260) g.cy = -260;
          ctx.strokeStyle = rgba(pal.a, 0.16);
          ctx.lineWidth = 1;
          ctx.beginPath();
          g.pts.forEach((p, i) => {
            const x = g.cx + p.ox,
              y = g.cy + p.oy;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          });
          ctx.stroke();
          for (const p of g.pts) {
            const x = g.cx + p.ox,
              y = g.cy + p.oy;
            const tw = 0.5 + 0.5 * Math.sin(t * 0.002 + p.ph);
            ctx.fillStyle = rgba(pal.a, 0.1 * tw);
            ctx.beginPath();
            ctx.arc(x, y, p.r * 5, 0, 6.28);
            ctx.fill();
            ctx.fillStyle = rgba(pal.a, 0.4 + tw * 0.5);
            ctx.beginPath();
            ctx.arc(x, y, p.r, 0, 6.28);
            ctx.fill();
          }
        }
      },
      onResize: init,
    };
  }

  // 点墨飞溅：墨点扩散 + 飞溅小墨滴
  function inkdot() {
    let blots = [];
    function spawn() {
      const drops = [];
      const n = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++)
        drops.push({ a: Math.random() * 6.28, d: Math.random() * 18 + 4, r: Math.random() * 3 + 1 });
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: 2,
        max: 20 + Math.random() * 48,
        life: 1,
        drops,
      };
    }
    function init() {
      blots = [];
      for (let i = 0; i < 7; i++) {
        const b = spawn();
        b.r = b.max * (0.3 + Math.random() * 0.7);
        blots.push(b);
      }
    }
    init();
    return {
      frame(t, dt) {
        clear();
        for (let i = blots.length - 1; i >= 0; i--) {
          const b = blots[i];
          b.r += (b.max - b.r) * 0.006 * dt + 0.08;
          b.life -= 0.00032 * dt;
          if (b.life <= 0) {
            blots.splice(i, 1);
            blots.push(spawn());
            continue;
          }
          ctx.fillStyle = rgba(pal.a, 0.1 * b.life);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, 6.28);
          ctx.fill();
          const k = b.r / b.max;
          for (const d of b.drops) {
            ctx.fillStyle = rgba(pal.a2, 0.14 * b.life);
            ctx.beginPath();
            ctx.arc(b.x + Math.cos(d.a) * d.d * k, b.y + Math.sin(d.a) * d.d * k, d.r, 0, 6.28);
            ctx.fill();
          }
        }
      },
      onResize: init,
    };
  }

  // 毛笔挥毫：粗细渐变的笔触轨迹，周期浮现淡出
  function brush() {
    let strokes = [];
    function spawn() {
      const y0 = Math.random() * H;
      const x0 = Math.random() * W * 0.55;
      const len = 140 + Math.random() * 280;
      const pts = [];
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const p = i / steps;
        pts.push({
          x: x0 + len * p,
          y: y0 + Math.sin(p * 3.2) * 24 - p * 12,
          w: (1 - Math.pow(p, 1.7)) * (7 + Math.random() * 5) + 1,
        });
      }
      return { pts, life: 1 };
    }
    function init() {
      strokes = [];
      for (let i = 0; i < 4; i++) {
        const s = spawn();
        s.life = 0.3 + Math.random() * 0.7;
        strokes.push(s);
      }
    }
    init();
    return {
      frame(t, dt) {
        clear();
        ctx.lineCap = 'round';
        for (let i = strokes.length - 1; i >= 0; i--) {
          const s = strokes[i];
          s.life -= 0.00055 * dt;
          if (s.life <= 0) {
            strokes.splice(i, 1);
            strokes.push(spawn());
            continue;
          }
          for (let j = 1; j < s.pts.length; j++) {
            const p0 = s.pts[j - 1],
              p1 = s.pts[j];
            ctx.strokeStyle = rgba(pal.a, 0.17 * s.life);
            ctx.lineWidth = p1.w;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        }
      },
      onResize: init,
    };
  }

  // 文字浮现：汉字短句缓缓上浮淡出
  function poem() {
    const CHARS = '道法自然上善若水知行合一格物致知厚德载物宁静致远星辰大海';
    let items = [];
    function spawn() {
      const n = 1 + Math.floor(Math.random() * 3);
      let s = '';
      for (let i = 0; i < n; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
      return {
        s,
        x: Math.random() * W * 0.92 + W * 0.04,
        y: H + 40,
        vy: -(0.1 + Math.random() * 0.2),
        size: 14 + Math.random() * 24,
        life: 1,
        rot: (Math.random() - 0.5) * 0.16,
      };
    }
    function init() {
      items = [];
      for (let i = 0; i < 10; i++) {
        const it = spawn();
        it.y = Math.random() * H;
        items.push(it);
      }
    }
    init();
    return {
      frame(t, dt) {
        clear();
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.y += it.vy * dt;
          it.life -= 0.00022 * dt;
          if (it.life <= 0 || it.y < -70) {
            items.splice(i, 1);
            items.push(spawn());
            continue;
          }
          ctx.save();
          ctx.translate(it.x, it.y);
          ctx.rotate(it.rot);
          ctx.font = it.size + 'px "Songti SC", "STSong", "SimSun", serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = rgba(pal.a, 0.14 * it.life);
          ctx.fillText(it.s, 0, 0);
          ctx.restore();
        }
      },
      onResize: init,
    };
  }

  // 悬浮光块：圆环/方框缓慢漂浮呼吸
  function float() {
    let items = [];
    function spawn() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: 10 + Math.random() * 48,
        vx: (Math.random() - 0.5) * 0.07,
        vy: (Math.random() - 0.5) * 0.07,
        ph: Math.random() * 6.28,
        sq: Math.random() > 0.62,
      };
    }
    function init() {
      items = [];
      const N = Math.max(8, Math.round((W * H) / 42000));
      for (let i = 0; i < N; i++) items.push(spawn());
    }
    init();
    return {
      frame(t, dt) {
        clear();
        for (const it of items) {
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          if (it.x < -70) it.x = W + 70;
          if (it.x > W + 70) it.x = -70;
          if (it.y < -70) it.y = H + 70;
          if (it.y > H + 70) it.y = -70;
          const b = 0.5 + 0.5 * Math.sin(t * 0.001 + it.ph);
          ctx.strokeStyle = rgba(pal.a, 0.08 + b * 0.12);
          ctx.lineWidth = 1.2;
          if (it.sq) ctx.strokeRect(it.x - it.r / 2, it.y - it.r / 2, it.r, it.r);
          else {
            ctx.beginPath();
            ctx.arc(it.x, it.y, it.r, 0, 6.28);
            ctx.stroke();
          }
        }
      },
      onResize: init,
    };
  }

  // 祥云 / 云雾：如意云团缓缓横移 + 底层弥散光雾（玄幻·云雾、古风·祥云）
  function xiangyun() {
    let clouds = [];
    function spawn() {
      return { x: Math.random() * W * 1.4 - W * 0.2, y: Math.random() * H, s: 0.6 + Math.random() * 1.2, vx: -(0.08 + Math.random() * 0.22) };
    }
    function init() {
      clouds = [];
      for (let i = 0; i < 7; i++) { const c = spawn(); c.y = Math.random() * H; clouds.push(c); }
    }
    function puff(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.28);
      ctx.arc(x + r * 0.95, y, r * 0.72, 0, 6.28);
      ctx.arc(x - r * 0.95, y, r * 0.72, 0, 6.28);
      ctx.arc(x + r * 0.45, y - r * 0.55, r * 0.6, 0, 6.28);
      ctx.arc(x - r * 0.45, y - r * 0.55, r * 0.6, 0, 6.28);
      ctx.fill();
    }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        const mg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
        mg.addColorStop(0, rgba(pal.a2, 0.05)); mg.addColorStop(1, rgba(pal.a2, 0));
        ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
        for (const c of clouds) {
          c.x += c.vx * dt;
          if (c.x < -W * 0.35) { Object.assign(c, spawn()); c.x = W * 1.2; }
          ctx.save();
          ctx.translate(c.x, c.y); ctx.scale(c.s, c.s);
          ctx.fillStyle = rgba(pal.a, 0.07);
          puff(0, 0, 28);
          ctx.restore();
        }
      },
    };
  }

  // 印章：篆意字符随方印缓缓上浮、淡入淡出（古风点缀）
  function yinzhang() {
    const CHARS = '墨劍江湖道禪印閑雅逸玄靜鶴';
    let seals = [];
    function spawn() {
      return { x: Math.random() * W, y: Math.random() * H, size: 30 + Math.random() * 34, life: 1, vy: -(0.015 + Math.random() * 0.04), rot: (Math.random() - 0.5) * 0.22, ch: CHARS[(Math.random() * CHARS.length) | 0] };
    }
    function init() {
      seals = [];
      for (let i = 0; i < 6; i++) { const s = spawn(); s.y = Math.random() * H; s.life = Math.random(); seals.push(s); }
    }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        for (let i = seals.length - 1; i >= 0; i--) {
          const s = seals[i];
          s.y += s.vy * dt; s.life -= 0.00012 * dt;
          if (s.life <= 0 || s.y < -60) { seals.splice(i, 1); seals.push(spawn()); s.y = H + 40; s.life = 1; continue; }
          const a = Math.sin(s.life * Math.PI) * 0.5;
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
          ctx.strokeStyle = rgba(pal.a, a * 0.5); ctx.lineWidth = 2;
          ctx.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size);
          ctx.fillStyle = rgba(pal.a, a * 0.42);
          ctx.font = (s.size * 0.7) + 'px "Songti SC","STSong","SimSun",serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s.ch, 0, 2);
          ctx.restore();
        }
      },
    };
  }

  // 星云：柔和粉紫弥散云团 + 星点（补足「星云粉色」）
  function nebula() {
    const base = stars();
    let blobs = [];
    function init() {
      base.onResize();
      blobs = [];
      for (let i = 0; i < 5; i++)
        blobs.push({ x: Math.random() * W, y: Math.random() * H, r: Math.min(W, H) * (0.2 + Math.random() * 0.25), h: Math.random() < 0.5 ? pal.a : pal.a2, ph: Math.random() * 6.28 });
    }
    init();
    return {
      onResize: init,
      frame(t, dt) {
        clear();
        for (const b of blobs) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 0.0004 + b.ph);
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, rgba(b.h, 0.06 + 0.05 * pulse));
          g.addColorStop(0.5, rgba(b.h, 0.03));
          g.addColorStop(1, rgba(b.h, 0));
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        base.frame(t, dt);
      },
    };
  }

  // 六边形网格（赛博）：蜂窝网格 + 缓慢滚动 + 扫描高亮（补足「六边形网格」）
  function hex() {
    const R = 26;
    function hexPath(cx, cy, r) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    }
    return {
      frame(t, dt) {
        clear();
        const dx = R * 1.5, dy = R * Math.sqrt(3);
        const off = (t * 0.02) % dy;
        ctx.strokeStyle = rgba(pal.a, 0.12); ctx.lineWidth = 1;
        for (let row = -1; row * dy < H + dy; row++) {
          for (let col = -1; col * dx < W + dx; col++) {
            const cx = col * dx + (row % 2 ? dx / 2 : 0);
            const cy = row * dy + off;
            hexPath(cx, cy, R);
            ctx.stroke();
          }
        }
        const sy = (t * 0.06) % (H + 120) - 60;
        const sg = ctx.createLinearGradient(0, sy - 50, 0, sy + 50);
        sg.addColorStop(0, rgba(pal.a, 0)); sg.addColorStop(0.5, rgba(pal.a, 0.16)); sg.addColorStop(1, rgba(pal.a, 0));
        ctx.fillStyle = sg; ctx.fillRect(0, sy - 50, W, 100);
      },
    };
  }

  // 古文古诗悬浮（古风为主）：整首竖排，缓入缓出 + 缓慢漂移
  function guwen() {
    const skin = document.documentElement.getAttribute('data-skin') || 'cosmic';
    const list = (POEMS[skin] && POEMS[skin].length) ? POEMS[skin] : (POEMS.ink || []);
    if (!list.length) return { frame() {} };
    const colW = 32, ch = 28;
    let idx = Math.floor(Math.random() * list.length);
    let poem = list[idx];
    let phase = 'in', a = 0, hold = 0;
    let cx = W * 0.5, cy = H * 0.5;
    function pick() {
      idx = (idx + 1) % list.length;
      poem = list[idx];
      phase = 'in'; a = 0; hold = 0;
      cx = W * (0.28 + Math.random() * 0.44);
      cy = H * (0.32 + Math.random() * 0.4);
    }
    function cols() {
      const c = [];
      c.push({ text: poem.title, big: true });
      if (poem.author) c.push({ text: (poem.dynasty ? poem.dynasty + '·' : '') + poem.author, small: true });
      for (const l of (poem.lines || [])) c.push({ text: l });
      return c;
    }
    return {
      onResize() {},
      frame(t, dt) {
        // 关键：必须每帧清屏。否则诗句会逐帧叠加成拖影（越看越糊），
        // 且点击爆发/力场粒子绘制后永不擦除，表现为"烟花不消失"。
        clear();
        if (phase === 'in') { a += dt * 0.001; if (a >= 1) { a = 1; phase = 'hold'; } }
        else if (phase === 'hold') { hold += dt; if (hold > 12000) phase = 'out'; }
        else if (phase === 'out') { a -= dt * 0.00025; if (a <= 0) { a = 0; pick(); } }
        // 缓慢上漂 + 轻微横向摆动
        cy -= 0.05 * dt * 0.06;
        cx += Math.sin(t * 0.00007) * 0.05 * dt * 0.02;
        if (cy < H * 0.2) cy = H * 0.82;
        const list2 = cols();
        const maxLen = Math.max(1, ...list2.map((c) => c.text.length));
        const blockH = maxLen * ch;
        const startX = cx + ((list2.length - 1) * colW) / 2;
        const startY = cy - blockH / 2 + ch / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < list2.length; i++) {
          const c = list2[i];
          const x = startX - i * colW;
          const fs = c.big ? 24 : c.small ? 16 : 21;
          ctx.font = fs + 'px "Songti SC","STSong","SimSun",serif';
          const colA = a * (c.big ? 0.62 : c.small ? 0.42 : 0.38);
          for (let j = 0; j < c.text.length; j++) {
            const y = startY + j * ch;
            // 底色描边提升对比度
            ctx.lineWidth = Math.max(2, fs * 0.13);
            ctx.strokeStyle = rgba(pal.bg, colA * 0.55);
            ctx.strokeText(c.text[j], x, y);
            ctx.fillStyle = rgba(pal.a, colA);
            ctx.fillText(c.text[j], x, y);
          }
        }
        ctx.restore();
      },
    };
  }

  // 全局交互层：粒子力场 + 点击爆发（叠加在所有主模式之上，自身不清除画布）
  const fx = {
    parts: [],
    bursts: [],
    init() {
      const N = Math.max(18, Math.min(50, Math.round((W * H) / 26000)));
      this.parts = [];
      for (let i = 0; i < N; i++)
        this.parts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.08, vy: (Math.random() - 0.5) * 0.08 });
    },
    forceFrame(t, dt) {
      const mode = settings.force;
      if (mode === 'off') return;
      const R = 100;
      for (const p of this.parts) {
        if (pointer.active) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < R && d > 0.01) {
            const f = (1 - d / R) * 0.35;
            const ux = dx / d, uy = dy / d;
            if (mode === 'attract') { p.vx -= ux * f; p.vy -= uy * f; }
            else { p.vx += ux * f; p.vy += uy * f; }
          }
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.93; p.vy *= 0.93;
        if (!pointer.active) { p.vx += (Math.random() - 0.5) * 0.008; p.vy += (Math.random() - 0.5) * 0.008; }
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
      }
      // 只画粒子点，不画连线：避免蛛网残影；阻尼加大使点击扰动更快消散
      ctx.fillStyle = rgba(pal.a, 0.25);
      for (const p of this.parts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, 6.28); ctx.fill();
      }
    },
    burstFrame(t, dt) {
      for (let k = this.bursts.length - 1; k >= 0; k--) {
        const b = this.bursts[k];
        b.life -= dt * 0.0022;
        b.ring += dt * 0.35;
        for (const p of b.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
        if (b.life <= 0) { this.bursts.splice(k, 1); continue; }
        const pl = Math.max(0, b.life);
        // 涟漪：更淡、更细，避免留下明显残影
        ctx.strokeStyle = rgba(pal.a, pl * 0.22);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.ring, 0, 6.28); ctx.stroke();
        for (const p of b.parts) {
          ctx.fillStyle = rgba(pal.a2, pl * 0.65);
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 * pl + 0.3, 0, 6.28); ctx.fill();
        }
      }
    },
  };
  function spawnBurst(x, y) {
    const n = 8;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * 6.28 + Math.random() * 0.6;
      const sp = 1.3 + Math.random() * 1.6;
      parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp });
    }
    fx.bursts.push({ x, y, parts, ring: 0, life: 1 });
  }

  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; }, { passive: true });
  document.addEventListener('mouseleave', () => { pointer.active = false; pointer.x = -9999; pointer.y = -9999; });
  // 移动端触控力场：触摸也驱动粒子排斥
  if (isTouch) {
    const setP = (e) => { const t = e.touches[0]; if (!t) return; pointer.x = t.clientX; pointer.y = t.clientY; pointer.active = true; };
    window.addEventListener('touchmove', setP, { passive: true });
    window.addEventListener('touchstart', setP, { passive: true });
    window.addEventListener('touchend', () => { pointer.active = false; }, { passive: true });
    window.addEventListener('touchcancel', () => { pointer.active = false; }, { passive: true });
  }
  window.addEventListener('blur', () => { pointer.active = false; });
  window.addEventListener('click', (e) => {
    if (reduce || settings.click === 'off') return;
    spawnBurst(e.clientX, e.clientY);
  }, { passive: true });

  // 调试钩子（供自动化校验 / 控制台排查；无副作用）
  window.__bg = {
    snapshot() {
      return {
        parts: fx.parts.length,
        bursts: fx.bursts.length,
        force: settings.force,
        click: settings.click,
        pointer: { x: pointer.x, y: pointer.y, active: pointer.active },
        reduce: reduce,
      };
    },
  };

  /* ---------------- 注册表 ---------------- */
  const REG = {
    cosmic: { star: stars, galaxy: galaxy, meteor: meteor, pixel: pixel, constellation: constellation, nebula: nebula, float: float },
    cyber: { grid: grid, matrix: matrix, holo: holo, circuit: circuit, hex: hex, float: float },
    xianxia: { qi: qi, rune: rune, lotus: lotus, poem: poem, xiangyun: xiangyun, constellation: constellation, guwen: guwen },
    ink: { ink: ink, landscape: landscape, petals: petals, inkdot: inkdot, brush: brush, poem: poem, xiangyun: xiangyun, yinzhang: yinzhang, guwen: guwen },
    minimal: { dust: dust, line: line, float: float },
  };
  // 默认背景：各皮肤挑最具辨识度的一种
  const DEFAULT_MODE = {
    cosmic: 'constellation',
    cyber: 'matrix',
    xianxia: 'rune',
    ink: 'brush',
    minimal: 'float',
  };

  let current = null;
  // 叠加合成：data-bg 支持 "A+B" 形式，叠加渲染 A 和 B
  function compose(parts) {
    return {
      onResize() { parts.forEach((p) => p.onResize && p.onResize()); },
      frame(t, dt) { parts.forEach((p) => p.frame(t, dt)); },
    };
  }
  function build() {
    const skin = document.documentElement.getAttribute('data-skin') || 'cosmic';
    const mode = document.documentElement.getAttribute('data-bg') || DEFAULT_MODE[skin] || 'star';
    const reg = REG[skin] || REG.cosmic;
    if (mode.includes('+')) {
      const ids = mode.split('+').filter(Boolean);
      const factories = ids.map((id) => reg[id]).filter(Boolean);
      if (factories.length === 1) current = factories[0]();
      else if (factories.length > 1) current = compose(factories.map((f) => f()));
      else current = (reg[DEFAULT_MODE[skin]] || stars)();
    } else {
      const factory = reg[mode] || reg[DEFAULT_MODE[skin]] || stars;
      current = factory();
    }
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resize();
  window.addEventListener('resize', resize);
  build();

  if (reduce) {
    current.frame(0, 0);
    return;
  }

  let last = 0;
  function loop(t) {
    const dt = Math.min(50, t - last || 16);
    last = t;
    current.frame(t, dt);
    if (settings.force !== 'off') fx.forceFrame(t, dt);
    if (settings.click !== 'off') fx.burstFrame(t, dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function refresh() { pal = getPal(); build(); readSettings(); }
  new MutationObserver(refresh).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-skin', 'data-theme', 'data-bg', 'data-bg-force', 'data-bg-click'],
  });
})();
