// ============================================================
// 空间音效 (Spatial Audio) — 规格书 §二.4
// Web Audio：AudioContext + StereoPanner；clientX → pan(-1..1)；
// 节流避免高频碰撞爆音；首次用户手势后再 resume（自动播放策略）。
// ============================================================
import { reduceMotion, throttle } from '../lib/universe.js';

let ctx = null;
let master = null;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.1;
    master.connect(ctx.destination);
    return true;
  } catch (e) {
    return false;
  }
}

/** 播放一声空间化 blip；pan 由 x 坐标决定，freq 可表达情绪 */
export function blip(freq = 520, pan = 0) {
  if (reduceMotion || !ctx) return;
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, now);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.16);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.6, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  o.connect(g);
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p);
    p.connect(master);
  } else {
    g.connect(master);
  }
  o.start(now);
  o.stop(now + 0.22);
}

export const blipThrottled = throttle((freq, pan) => blip(freq, pan), 45);

/** 首次交互后初始化/恢复音频上下文 */
export function initAudio() {
  if (reduceMotion) return;
  const onFirst = () => {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    addEventListener(ev, onFirst, { once: true })
  );
}

/** 由屏幕 x 坐标得到声像值 */
export function panFromX(x) {
  return Math.max(-1, Math.min(1, (x / innerWidth) * 2 - 1));
}
