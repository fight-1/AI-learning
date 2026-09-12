// ============================================================
// 引力星轨 (Gravity Orbits) — 标签系统 — 规格书 §二.1
// Canvas 2D：节点受中心引力约束；光标为动态引力源（distance<阈值施加吸引）；
// 邻近节点动态生成连线（opacity 随距离衰减）；支持 500+ 节点 60fps。
// ============================================================
import { onTick, reduceMotion, isTouch, cssVar } from '../lib/universe.js';
import { blipThrottled, panFromX } from './audio.js';

export function initOrbits(canvas, graph) {
  if (reduceMotion || !graph || !graph.nodes.length) return;
  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = canvas.clientWidth * dpr;
    H = canvas.height = canvas.clientHeight * dpr;
  };
  resize();
  addEventListener('resize', resize);

  const accent = cssVar('--accent-color', '#38bdf8');
  const maxC = Math.max(...graph.nodes.map((n) => n.count));

  const pts = graph.nodes.map((n, i) => {
    const ang = (i / graph.nodes.length) * Math.PI * 2;
    const r = 40 + Math.random() * 160;
    return {
      n,
      x: W / 2 + Math.cos(ang) * r,
      y: H / 2 + Math.sin(ang) * r,
      vx: 0,
      vy: 0,
      rad: 2 + (n.count / maxC) * 7,
    };
  });

  let mx = -9999,
    my = -9999;
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mx = (e.clientX - rect.left) * dpr;
    my = (e.clientY - rect.top) * dpr;
  });
  canvas.addEventListener('pointerleave', () => {
    mx = -9999;
    my = -9999;
  });
  // 点击节点 → 跳转标签页
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * dpr;
    const cy = (e.clientY - rect.top) * dpr;
    for (const p of pts) {
      if (Math.hypot(p.x - cx, p.y - cy) < p.rad * 2.2 * dpr) {
        location.href = '/notes?tag=' + encodeURIComponent(p.n.id);
        return;
      }
    }
  });

  const center = () => ({ x: W / 2, y: H / 2 });
  const K = 0.6; // 中心引力
  const CURSOR_R = 160 * dpr;

  onTick((dt) => {
    const c = center();
    for (const p of pts) {
      // 中心引力
      let ax = (c.x - p.x) * K * 0.02;
      let ay = (c.y - p.y) * K * 0.02;
      // 光标引力源
      const dx = mx - p.x,
        dy = my - p.y;
      const d = Math.hypot(dx, dy);
      if (d < CURSOR_R && d > 1) {
        const f = (1 - d / CURSOR_R) * 60;
        ax += (dx / d) * f;
        ay += (dy / d) * f;
      }
      p.vx = (p.vx + ax * dt) * 0.92;
      p.vy = (p.vy + ay * dt) * 0.92;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    ctx.clearRect(0, 0, W, H);
    // 连线（邻近生成，opacity 随距离衰减）
    const EDGE = 90 * dpr;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i],
          b = pts[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < EDGE) {
          ctx.globalAlpha = (1 - d / EDGE) * 0.5;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    // 节点
    for (const p of pts) {
      ctx.beginPath();
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8 * dpr;
      ctx.arc(p.x, p.y, p.rad * dpr, 0, Math.PI * 2);
      ctx.fill();
      if (p.rad > 4 * dpr) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = cssVar('--text', '#fff');
        ctx.globalAlpha = 0.85;
        ctx.font = `${Math.max(10, p.rad) * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.n.id, p.x, p.y - p.rad * dpr - 4 * dpr);
        ctx.globalAlpha = 1;
      }
    }
    ctx.shadowBlur = 0;
  });
}
