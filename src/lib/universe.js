// ============================================================
// Fight-1 活体宇宙 · 核心调度器 (Universe Core)
// 单一全局 rAF Ticker（delta time）+ Store（读 CSS 变量）+ 降级策略
// 规格书 §一：所有实时动画统一注册到一个 Ticker；性能/无障碍开关。
// ============================================================

// —— 设备 / 无障碍探测 ——
export const reduceMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch =
  window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// 降级档位（规格书 §三）
function perfTier() {
  if (reduceMotion) return 'a11y';
  if (isTouch) return 'mobile';
  // 低端机粗判：逻辑核心少或内存小
  const low =
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);
  return low ? 'low' : 'high';
}
export const tier = perfTier();

// —— 全局 Ticker（单一渲染循环）——
const cbs = new Set();
let running = false;
let last = 0;
let rafId = 0;

function frame(t) {
  if (!running) return;
  // delta time（秒），钳制避免切回标签页时大跳变
  const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
  last = t;
  cbs.forEach((cb) => {
    try {
      cb(dt, t);
    } catch (e) {
      /* 单个回调出错不影响整体循环 */
    }
  });
  rafId = requestAnimationFrame(frame);
}

function start() {
  if (running) return;
  running = true;
  last = 0;
  rafId = requestAnimationFrame(frame);
}

function stop() {
  running = false;
  cancelAnimationFrame(rafId);
}

/** 注册每帧回调，返回取消函数。文档.hidden 时自动暂停（规格书 §一） */
export function onTick(cb) {
  cbs.add(cb);
  if (!running && !document.hidden) start();
  return () => cbs.delete(cb);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else if (cbs.size) start();
});

// —— Store：读取主题状态与 CSS 变量（禁止在 JS 硬编码颜色）——
export function getSkin() {
  return document.documentElement.getAttribute('data-skin') || 'star';
}
export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}
export function getBg() {
  return document.documentElement.getAttribute('data-bg') || 'stars';
}
export function cssVar(name, fallback = '') {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}
export function accentColor() {
  return cssVar('--accent-color', '#38bdf8');
}
export function glowColor() {
  return cssVar('--glow-color', 'rgba(56,189,248,.35)');
}

// —— 工具 ——
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** 帧率无关的平滑系数：每秒逼近 rate 比例 */
export const smooth = (rate, dt) => 1 - Math.pow(1 - rate, dt * 60);
export function throttle(fn, ms) {
  let last = 0;
  return (...a) => {
    const now = performance.now();
    if (now - last >= ms) {
      last = now;
      fn(...a);
    }
  };
}
