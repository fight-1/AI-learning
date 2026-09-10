// ============================================================
// 舰长控制台 · 探索成就 + 彩蛋 — 文档1 §五 / 规格书 §四 QA
// 成就：首次点赞、首次收藏、首次雷达、凌晨3点航行、读满 5 篇、换 3 套皮肤
// 彩蛋：输入 ↑↓←→（或 updownleftright）→ 全屏 Glitch；卡片甩出屏幕→像素碎裂重组
// ============================================================
import gsap from 'gsap';
import { reduceMotion } from '../lib/universe.js';
import { blipThrottled } from './audio.js';

const KEY_BADGE = 'badges';

const BADGES = [
  { id: 'first-like', ico: '⚛', name: '首次注入能量' },
  { id: 'first-fav', ico: '🛰', name: '首次牵引入库' },
  { id: 'radar', ico: '📡', name: '深空探测者' },
  { id: 'night-owl', ico: '🌙', name: '凌晨三点航行' },
  { id: 'reader', ico: '📖', name: '阅读 5 篇' },
  { id: 'shapeshifter', ico: '🎭', name: '形态切换者' },
];

const getBadges = () => JSON.parse(localStorage.getItem(KEY_BADGE) || '[]');

function unlock(id) {
  const cur = getBadges();
  if (cur.includes(id)) return;
  cur.push(id);
  localStorage.setItem(KEY_BADGE, JSON.stringify(cur));
  const b = BADGES.find((x) => x.id === id);
  toast(`${b.ico} 解锁成就：${b.name}`);
  document.dispatchEvent(new CustomEvent('badge:unlocked'));
}

function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed',
    left: '50%',
    bottom: '32px',
    transform: 'translateX(-50%)',
    padding: '10px 18px',
    borderRadius: '999px',
    background: 'var(--surface)',
    border: '1px solid var(--accent-color)',
    color: 'var(--text)',
    boxShadow: '0 0 20px var(--glow)',
    zIndex: '9800',
    fontSize: '13px',
  });
  document.body.appendChild(t);
  gsap.fromTo(t, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 });
  setTimeout(() => {
    gsap.to(t, { y: 20, opacity: 0, duration: 0.3, onComplete: () => t.remove() });
  }, 2600);
}

export function renderBadges(container) {
  if (!container) return;
  const owned = getBadges();
  container.innerHTML = BADGES.map(
    (b) => `<div class="badge ${owned.includes(b.id) ? 'earned' : ''}">
      <span class="ico">${b.ico}</span><span>${b.name}</span>
      <span style="opacity:.6;font-size:11px">${owned.includes(b.id) ? '已解锁' : '未解锁'}</span>
    </div>`
  ).join('');
}

export function initAchievements() {
  // 首次点赞
  document.addEventListener('ach:like', () => unlock('first-like'));
  // 首次收藏
  document.addEventListener('favs:changed', () => {
    if ((JSON.parse(localStorage.getItem('favs') || '[]')).length > 0) unlock('first-fav');
  });
  // 首次使用雷达
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-radar]')) unlock('radar');
  });
  // 换皮肤计数
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-skin-set]');
    if (!s) return;
    const used = JSON.parse(localStorage.getItem('skinsUsed') || '[]');
    const v = s.dataset.skinSet;
    if (!used.includes(v)) used.push(v);
    localStorage.setItem('skinsUsed', JSON.stringify(used));
    if (used.length >= 3) unlock('shapeshifter');
  });
  // 凌晨 3 点航行
  if (new Date().getHours() === 3) unlock('night-owl');
  // 阅读篇数（文章页）
  if (document.querySelector('.detail')) {
    const id = location.pathname;
    const visited = JSON.parse(localStorage.getItem('visited') || '[]');
    if (!visited.includes(id)) visited.push(id);
    localStorage.setItem('visited', JSON.stringify(visited));
    if (visited.length >= 5) unlock('reader');
  }
}

/* ——— 彩蛋 ——— */
export function initEaster() {
  if (reduceMotion) return;
  // 1) 方向键序列 ↑↓←→ 或输入 updownleftright → 全屏 Glitch
  const SEQ = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const WORD = 'updownleftright';
  let buf = [];
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.key.startsWith('Arrow')) {
      buf.push(e.key);
      if (buf.length > 4) buf.shift();
      if (buf.join(',') === SEQ.join(',')) {
        glitch();
        buf = [];
      }
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      typed = (typed + e.key.toLowerCase()).slice(-WORD.length);
      if (typed === WORD) {
        glitch();
        typed = '';
      }
    }
  });

  function glitch() {
    const g = document.createElement('div');
    g.className = 'glitch-overlay';
    document.body.appendChild(g);
    requestAnimationFrame(() => g.classList.add('on'));
    blipThrottled(1400, 0);
    setTimeout(() => {
      g.classList.remove('on');
      setTimeout(() => g.remove(), 400);
    }, 1400);
  }

  // 2) 快速甩卡出屏 → 像素碎裂与重组
  let down = null;
  document.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.stage-card, .note-card');
    down = card ? { card, x: e.clientX, y: e.clientY, t: performance.now() } : null;
  });
  document.addEventListener('pointerup', (e) => {
    if (!down) return;
    const { card, x, y, t } = down;
    down = null;
    const dt = performance.now() - t;
    const v = Math.hypot(e.clientX - x, e.clientY - y) / Math.max(16, dt);
    if (v < 1.2) return; // 速度不足
    const edge =
      e.clientX < 8 || e.clientX > innerWidth - 8 || e.clientY < 8 || e.clientY > innerHeight - 8;
    if (edge) pixelShatter(card);
  });
}

function pixelShatter(el) {
  const r = el.getBoundingClientRect();
  const cols = 8,
    rows = 6;
  const cw = r.width / cols,
    ch = r.height / rows;
  const frag = document.createDocumentFragment();
  const cells = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const d = document.createElement('div');
      d.className = 'pixel-shatter';
      d.style.left = r.left + i * cw + 'px';
      d.style.top = r.top + j * ch + 'px';
      d.style.width = cw + 'px';
      d.style.height = ch + 'px';
      frag.appendChild(d);
      cells.push(d);
    }
  }
  document.body.appendChild(frag);
  el.style.opacity = '0.15';
  blipThrottled(200, 0);
  cells.forEach((d) => {
    gsap.to(d, {
      x: (Math.random() - 0.5) * 420,
      y: (Math.random() - 0.5) * 420,
      rotation: (Math.random() - 0.5) * 180,
      opacity: 0,
      duration: 0.45,
      ease: 'power2.out',
    });
  });
  // 重组归位
  setTimeout(() => {
    cells.forEach((d) => {
      gsap.to(d, { x: 0, y: 0, rotation: 0, opacity: 0.9, duration: 0.5, ease: 'power3.inOut' });
    });
  }, 460);
  setTimeout(() => {
    cells.forEach((d) => d.remove());
    gsap.to(el, { opacity: 1, duration: 0.3 });
  }, 1100);
}
