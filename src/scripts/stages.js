// ============================================================
// 反重力卡片舞台 (6 Modes Morphing) — 规格书 §二.3
// GSAP 插值 + CSS 3D；切换用 to() 平滑过渡，禁止销毁重建 DOM。
// 布局按卡片实际尺寸计算间距，避免堆叠；圆柱/球面/螺旋带自转。
//
// 关键修正（2026-09-09）：
// 1) 逐帧模式(tick)使用【相对中心】的偏移 t.x/t.y；容器 left/top 已设为居中基准，
//    不可再叠加 cx/cy，否则所有逐帧卡片整体右偏（"卡片偏"根因）。
// 2) cylinder 模式必须自己用角度算 x/z 并 rotationY 朝外，原 z:R+ry 写法会把
//    全部卡片堆在同一前平面（"一坨"根因）。
// 3) spiral 纵向间距由 CH*0.42(≈80) 改为 CH*0.85(≈162) > 卡片高，避免纵向重叠。
// ============================================================
import gsap from 'gsap';
import { onTick, reduceMotion } from '../lib/universe.js';

const MODES = ['grid', 'depth', 'fan', 'cylinder', 'sphere', 'spiral', 'wave'];
const CW = 240; // 卡片宽
const CH = 190; // 卡片估算高（用于行距/层距）

export function initStages(view, cards, bar) {
  if (!cards.length) return;
  let mode = 'grid';
  let spin = 0;
  let waveT = 0;
  let unsub = null;
  const n = cards.length;
  const mid = (n - 1) / 2;

  const H = () => Math.max(view.clientHeight, 520);

  /** 静态模式：用 gsap.to 平滑过渡（t.x/y 为相对中心的偏移） */
  function settle(el, t, extra = {}) {
    gsap.to(el, {
      duration: reduceMotion ? 0 : 0.7,
      ease: 'power3.inOut',
      xPercent: -50,
      yPercent: -50,
      x: t.x,
      y: t.y,
      z: t.z || 0,
      rotation: t.rot || 0,
      rotationX: t.rx || 0,
      rotationY: t.ry || 0,
      scale: t.scale ?? 1,
      opacity: t.opacity ?? 1,
      ...extra,
    });
  }

  /** 逐帧模式：圆柱 / 球面 / 螺旋 / 波浪（t.x/y 同样为相对中心的偏移） */
  function tick(dt) {
    const w = view.clientWidth;
    const h = view.clientHeight;
    // 半径：保底让环形排布不重叠，且不超过容器短边以免裁切
    const fitR = (CW / 2) / Math.tan(Math.PI / Math.max(n, 3)) + 60;
    const R = Math.max(Math.min(w, h) * 0.4, fitR);
    if (mode === 'cylinder' || mode === 'sphere' || mode === 'spiral') spin += dt * 18; // 度/秒
    if (mode === 'wave') waveT += dt;

    cards.forEach((el, i) => {
      let t;
      if (mode === 'cylinder') {
        // 正确圆柱：角度算 x/z，rotationY 让卡片朝外
        const ang = ((i / n) * 360 + spin) * (Math.PI / 180);
        t = {
          x: Math.sin(ang) * R,
          y: 0,
          z: Math.cos(ang) * R,
          ry: (ang * 180) / Math.PI,
          rx: 0,
          scale: 0.92,
          opacity: 1,
        };
      } else if (mode === 'sphere') {
        // Fibonacci 球面分布，避免 n 较小时端点退化
        const y = n > 0 ? 1 - ((2 * i + 1) / n) : 0;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + (spin * Math.PI) / 180;
        t = {
          x: Math.cos(theta) * rad * R,
          z: Math.sin(theta) * rad * R,
          y: y * R * 0.82,
          ry: (theta * 180) / Math.PI,
          rx: -Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI),
          scale: 0.82,
          opacity: 0.96,
        };
      } else if (mode === 'spiral') {
        const a = i * 0.85 + (spin * Math.PI) / 180;
        const yStep = CH * 0.85; // 纵向间距 > 卡片高，避免堆叠
        t = {
          x: Math.cos(a) * R * 0.5,
          z: Math.sin(a) * R * 0.5,
          y: (i - mid) * yStep,
          ry: (a * 180) / Math.PI * 0.5,
          rx: 0,
          scale: 1 - i * 0.012,
          opacity: 1 - i * 0.025,
        };
      } else if (mode === 'wave') {
        const perRow = Math.max(1, Math.floor((w - 40) / (CW + 28)));
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = (col - (Math.min(n, perRow) - 1) / 2) * (CW + 28);
        const y = (row - (Math.ceil(n / perRow) - 1) / 2) * (CH + 30);
        const ph = col * 0.55 + waveT * 1.8;
        t = {
          x,
          y: y + Math.sin(ph) * 22,
          z: 0,
          ry: Math.sin(ph) * 8,
          rx: 0,
          scale: 1,
          opacity: 1,
        };
      } else return;
      gsap.set(el, {
        xPercent: -50,
        yPercent: -50,
        x: t.x,
        y: t.y,
        z: t.z || 0,
        rotationX: t.rx || 0,
        rotationY: t.ry || 0,
        scale: t.scale ?? 1,
        opacity: t.opacity ?? 1,
      });
    });
  }

  function layout(m) {
    const w = view.clientWidth;
    const cx = w / 2;
    const cy = H() / 2;

    if (m === 'grid') {
      view.style.height = '';
      cards.forEach((el) => {
        el.style.position = 'relative';
        el.style.left = '';
        el.style.top = '';
        gsap.to(el, {
          xPercent: 0,
          yPercent: 0,
          x: 0,
          y: 0,
          z: 0,
          rotation: 0,
          rotationX: 0,
          rotationY: 0,
          scale: 1,
          opacity: 1,
          duration: reduceMotion ? 0 : 0.6,
          ease: 'power3.inOut',
        });
      });
      return;
    }

    // 各模式所需高度。
    //   - 居中类(cyl/sphere/wave/fan)按视口高度封顶，避免卡片被推到视口外
    //   - 纵深/螺旋本身需要铺满高度(垂直堆叠)，保持计算高度，靠 scrollIntoView 拉回视口
    const rows = Math.ceil(n / Math.max(1, Math.floor((w - 40) / (CW + 28))));
    const spiralStep = CH * 0.85;
    const vh = window.innerHeight;
    const capDyn = Math.max(520, Math.floor(vh * 0.8)); // 动态居中模式用视口相关高度
    const heights = {
      depth: n * (CH + 30) + 140,
      fan: capDyn,
      cylinder: capDyn,
      sphere: capDyn,
      spiral: n * spiralStep + 240,
      wave: Math.max(rows * (CH + 30) + 220, capDyn),
    };
    view.style.height = Math.max(heights[m] || capDyn, 520) + 'px';

    const cy2 = view.clientHeight / 2;
    cards.forEach((el, i) => {
      el.style.position = 'absolute';
      el.style.left = cx + 'px';
      el.style.top = cy2 + 'px';
      let t;
      switch (m) {
        case 'depth':
          // 纵深叠排：Y 间距 = 卡片高+30，每张独立可见，靠 Z 与缩放制造层次
          t = {
            x: 0,
            y: (i - mid) * (CH + 30),
            z: -i * 90,
            rx: 0,
            ry: 0,
            scale: 1 - i * 0.04,
            opacity: 1 - i * 0.06,
          };
          settle(el, t);
          break;
        case 'fan':
          // 扇形：n 少时放宽横向/旋转/层深，n 多时收敛；绕底部支点散开
          const xStep = Math.max(78, Math.round(360 / Math.max(n, 2)));
          const yStep = Math.max(8, Math.round(56 / Math.max(n, 2)));
          const rotMax = Math.min(20, Math.round(110 / Math.max(n, 2)));
          t = {
            x: (i - mid) * xStep,
            y: Math.abs(i - mid) * yStep,
            z: -Math.abs(i - mid) * Math.max(18, Math.round(120 / Math.max(n, 2))),
            rot: (i - mid) * rotMax,
            rx: 0,
            ry: 0,
            scale: 1,
            opacity: 1,
          };
          settle(el, t, { transformOrigin: '50% 100%' });
          break;
        default:
          break; // cylinder/sphere/spiral/wave 由 tick 逐帧驱动
      }
    });
  }

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-stage]');
    if (!b) return;
    const m = b.dataset.stage;
    if (!MODES.includes(m) || m === mode) return;
    mode = m;
    bar.querySelectorAll('[data-stage]').forEach((x) => x.classList.toggle('active', x === b));
    const dynamic = ['cylinder', 'sphere', 'spiral', 'wave'].includes(m);
    if (dynamic) {
      if (!unsub) unsub = onTick(tick);
    } else if (unsub) {
      unsub();
      unsub = null;
    }
    layout(m); // 先定位容器 left/top 与高度
    if (dynamic) tick(0.016); // 立即逐帧定位，避免切换瞬间闪烁
    // 仅真实用户点击才把舞台滚到视口顶部（避开粘性导航）；
    // 程序化触发(isTrusted=false，用于返回时还原舞台模式)不要自动滚动，以免覆盖滚动记忆
    if (e.isTrusted) {
      requestAnimationFrame(() => {
        view.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });

  cards.forEach((el) => {
    el.style.position = 'relative';
  });

  view.style.scrollMarginTop = '72px';
}
