// ============================================================
// 着陆动画 (Landing Warp) — 规格书 §四 QA：首屏粒子爆开重组为网格
// 一次性（同会话仅一次）；reduced-motion / 触屏跳过。
// ============================================================
import { onTick, reduceMotion, isTouch, cssVar } from '../lib/universe.js';

if (!reduceMotion && !isTouch && !sessionStorage.getItem('fight1_landed')) {
  sessionStorage.setItem('fight1_landed', '1');
  const cv = document.createElement('canvas');
  cv.className = 'landing-canvas';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W, H, dpr;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * dpr;
    H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
  };
  resize();
  addEventListener('resize', resize);

  const N = 220;
  const cols = Math.ceil(Math.sqrt(N * (innerWidth / innerHeight)));
  const rows = Math.ceil(N / cols);
  const accent = cssVar('--accent-color', '#38bdf8');
  const glow = cssVar('--glow-color', 'rgba(56,189,248,.5)');
  const parts = [];
  for (let i = 0; i < N; i++) {
    const gx = ((i % cols) + 0.5) / cols;
    const gy = (Math.floor(i / cols) + 0.5) / rows;
    const tx = gx * W;
    const ty = gy * H;
    const ang = Math.random() * Math.PI * 2;
    const sp = (0.2 + Math.random() * 0.5) * Math.max(W, H);
    parts.push({
      x: W / 2,
      y: H / 2,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      tx,
      ty,
      r: (1 + Math.random() * 2) * dpr,
      // 0=爆发飞散 1=被网格吸引
      phase: 0,
      a: 1,
    });
  }

  let t0 = performance.now();
  const unsub = onTick((dt) => {
    const el = (performance.now() - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    // 阶段：前 0.5s 飞散，0.5s 后向网格位置吸引
    const attract = Math.max(0, (el - 0.5) / 1.0);
    const k = 1 - Math.pow(0.0001, dt);
    let allSettled = true;
    for (const p of parts) {
      if (el < 0.5) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        allSettled = false;
      } else {
        p.x += (p.tx - p.x) * k * 0.25;
        p.y += (p.ty - p.y) * k * 0.25;
        if (Math.hypot(p.tx - p.x, p.ty - p.y) > 2 * dpr) allSettled = false;
      }
      const alpha = el < 0.5 ? 1 : Math.max(0, 1 - (el - 1.2) / 0.6);
      ctx.beginPath();
      ctx.fillStyle = accent;
      ctx.globalAlpha = alpha;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 网格连线（重组后隐约可见）
    if (el > 1.2 && el < 2.0) {
      ctx.strokeStyle = glow;
      ctx.globalAlpha = (1 - (el - 1.2) / 0.8) * 0.4;
      ctx.lineWidth = 1 * dpr;
      for (let r = 0; r <= rows; r++) {
        const y = ((r + 0.5) / rows) * H;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (el > 2.0 || (el > 1.2 && allSettled)) {
      unsub();
      cv.style.opacity = '0';
      setTimeout(() => cv.remove(), 400);
    }
  });
}
