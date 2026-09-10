// ============================================================
// 活体光标 (Live Cursor) + 粒子跟随拖尾 — 规格书 §二.4
// · cursor:none 隐藏原生指针；DOM 节点 + Lerp 双速跟随（环慢、点快）
// · canvas 粒子层：移动时发射发光火花拖尾，颜色取当前主题强调色
// · 触屏 / 减少动效 / a11y：不启用，保留系统光标
// ============================================================
import {
  onTick,
  reduceMotion,
  isTouch,
  getSkin,
  cssVar,
} from '../lib/universe.js';

if (!isTouch && !reduceMotion) {
  document.documentElement.classList.add('live-cursor');

  /* ---------- 1) 粒子拖尾画布 ---------- */
  const cv = document.createElement('canvas');
  cv.id = 'cursor-fx';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W, H, dpr;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = Math.floor(innerWidth * dpr);
    H = cv.height = Math.floor(innerHeight * dpr);
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
  };
  resize();
  addEventListener('resize', resize);

  // 颜色优先读 --particle（亮色主题会自动加深），回退强调色
  let accent = cssVar('--particle') || cssVar('--accent-color', '#38bdf8');
  const refreshColor = () => (accent = cssVar('--particle') || cssVar('--accent-color', '#38bdf8'));
  new MutationObserver(refreshColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-skin', 'data-theme'],
  });

  const parts = [];
  const MAX = 260;
  function emit(x, y, speed) {
    const n = Math.min(4, 1 + Math.floor(speed / 6));
    for (let i = 0; i < n; i++) {
      if (parts.length > MAX) break;
      const a = Math.random() * Math.PI * 2;
      const v = 0.4 + Math.random() * 1.6 + Math.min(speed * 0.06, 2.4);
      parts.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1,
        decay: 0.016 + Math.random() * 0.022,
        r: (1 + Math.random() * 2.6) * dpr,
      });
    }
  }

  /* ---------- 2) DOM 光标（环 + 点） ---------- */
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  cursor.append(ring, dot);
  document.body.appendChild(cursor);

  const syncFlavor = () => (cursor.dataset.skin = getSkin());
  syncFlavor();
  new MutationObserver(syncFlavor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-skin'],
  });

  let mx = innerWidth / 2,
    my = innerHeight / 2; // 目标（真实指针）
  let rx = mx,
    ry = my; // 外环（慢）
  let dx = mx,
    dy = my; // 内核（快）
  let px = mx,
    py = my; // 上一帧位置（算速度）
  let seen = false;

  addEventListener(
    'pointermove',
    (e) => {
      if (!seen) {
        // 首次移动时直接归位，避免从屏幕中心"飞"过来
        rx = dx = px = mx = e.clientX;
        ry = dy = py = my = e.clientY;
        seen = true;
        return;
      }
      mx = e.clientX;
      my = e.clientY;
      if (!enabled) return;
      const speed = Math.hypot(mx - px, my - py);
      emit(mx, my, speed);
      px = mx;
      py = my;
    },
    { passive: true }
  );

  onTick((dt) => {
    if (!enabled) return;
    // 位置：帧率无关的指数平滑（环更黏、点更跟手）
    const kr = 1 - Math.pow(0.0015, dt);
    const kd = 1 - Math.pow(0.00005, dt);
    rx += (mx - rx) * kr;
    ry += (my - ry) * kr;
    dx += (mx - dx) * kd;
    dy += (my - dy) * kd;
    // 居中统一由 translate(-50%,-50%) 完成（CSS 不再设 margin，避免双重偏移）
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;

    // 粒子更新
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.vy += 0.02 * dt * 60; // 轻微下坠
      p.life -= p.decay * dt * 60;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      const g = ctx.createRadialGradient(p.x * dpr, p.y * dpr, 0, p.x * dpr, p.y * dpr, p.r * 4);
      g.addColorStop(0, accent);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha = Math.max(0, p.life) * 0.9;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x * dpr, p.y * dpr, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  /* ---------- 4) 开关（控制台可关闭；关闭时恢复系统光标） ---------- */
  let enabled = localStorage.getItem('live_cursor') !== 'off';
  const apply = () => {
    document.documentElement.classList.toggle('live-cursor', enabled);
    cursor.style.display = enabled ? '' : 'none';
    cv.style.display = enabled ? '' : 'none';
  };
  apply();
  document.addEventListener('cursor:toggle', (e) => {
    enabled = e.detail;
    apply();
  });

  /* ---------- 3) 悬停/按下状态 ---------- */
  const SEL =
    'a, button, input, textarea, .chip, .radar-trigger, .stage-card, .note-card, [data-interactive]';
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest && e.target.closest(SEL)) cursor.classList.add('is-active');
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest && e.target.closest(SEL)) cursor.classList.remove('is-active');
  });
  addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  addEventListener('pointerup', () => cursor.classList.remove('is-down'));
}
