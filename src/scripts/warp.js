// ============================================================
// 沉浸式跃迁 + 休眠舱 + 能量条 — 文档1 §三
// 跃迁：卡片共享元素过渡→展开、背景暗化、文字逐行浮现（可配置）
// 休眠舱：进入文章后 3D 舞台/粒子/活体光标/音效全部休眠，仅留纯净排版+微呼吸光
// 能量条：阅读进度=飞船能量槽/跃迁充能条
// ============================================================
import gsap from 'gsap';
import { reduceMotion } from '../lib/universe.js';
import { blipThrottled, panFromX } from './audio.js';

/** 跃迁：点击笔记卡片 → 克隆元素放大至全屏 → 跳转 */
export function initWarp() {
  if (reduceMotion) return;
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.stage-card a, .note-card a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const card = link.closest('.stage-card') || link.closest('.note-card');
    const r = card.getBoundingClientRect();
    const clone = document.createElement('div');
    clone.className = 'warp-clone';
    clone.style.left = r.left + 'px';
    clone.style.top = r.top + 'px';
    clone.style.width = r.width + 'px';
    clone.style.height = r.height + 'px';
    // 共享元素：克隆卡片真实内容（含标题/摘要/标签），避免"白块放大"
    const inner = card.querySelector('.note-link') || card;
    clone.innerHTML = `<div class="warp-inner">${inner.innerHTML}</div>`;
    document.body.appendChild(clone);
    blipThrottled(880, panFromX(r.left));
    gsap.to(clone, {
      left: 0,
      top: 0,
      width: innerWidth,
      height: innerHeight,
      duration: 0.42,
      ease: 'power2.inOut',
      onComplete: () => {
        location.href = href;
      },
    });
  });
}

/** 休眠舱 + 能量条 + 逐行浮现 */
export function initCryo() {
  const art = document.querySelector('.detail');
  if (!art) return;
  // 进入休眠舱：隐藏 3D/粒子/光标/音效（CSS 由 body.cryo-mode 控制）
  document.body.classList.add('cryo-mode');

  // 能量条（飞船能量槽）
  const bar = document.createElement('div');
  bar.className = 'energy-bar';
  const fill = document.createElement('div');
  fill.className = 'energy-fill';
  bar.appendChild(fill);
  document.body.appendChild(bar);
  const update = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? Math.min(1, scrollY / h) : 0;
    fill.style.height = (p * 100).toFixed(1) + '%';
  };
  addEventListener('scroll', update, { passive: true });
  update();

  // 逐行浮现（可配置：localStorage warp_typing = 'off' 关闭）
  const on = localStorage.getItem('warp_typing') !== 'off';
  if (!on || reduceMotion) return;
  const blocks = Array.from(document.querySelectorAll('.prose > *'));
  if (!blocks.length) return;
  gsap.set(blocks, { opacity: 0, y: 12 });
  gsap.to(blocks, {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: 'power2.out',
    stagger: 0.045,
    delay: 0.15,
  });
}
