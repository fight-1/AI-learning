// ============================================================
// 深空雷达搜索 (Deep Space Radar) — 文档1 §一
// 全局雷达按钮 → 中心发光扫描圈；输入关键词，相关卡片被"引力牵引"飞入中心按相关度排列；
// 无结果：雷达闪红"未检测到该星系的信号"并推荐邻近星系(热门标签)。
// ============================================================
import gsap from 'gsap';
import { accentColor, glowColor, blipThrottled, panFromX } from './audio.js';

let data = null;
let overlay = null;

async function loadData() {
  if (data) return data;
  try {
    const res = await fetch('/search.json');
    data = await res.json();
  } catch (e) {
    data = [];
  }
  return data;
}

function scoreNote(n, q) {
  const ql = q.toLowerCase();
  let s = 0;
  if (n.title.toLowerCase().includes(ql)) s += 10;
  if (n.category && n.category.toLowerCase().includes(ql)) s += 6;
  (n.tags || []).forEach((t) => {
    if (t.toLowerCase().includes(ql)) s += 4;
  });
  if (n.summary && n.summary.toLowerCase().includes(ql)) s += 2;
  return s;
}

function buildOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'radar-overlay';
  overlay.innerHTML = `
    <div class="radar-scope">
      <button class="radar-close" aria-label="关闭">✕</button>
      <input class="radar-input" placeholder="向深空发送探测信号…（输入即检索）" />
      <div class="radar-results"></div>
      <div class="radar-no-signal" hidden>
        <div style="font-size:18px;font-weight:700">⚠ 未检测到该星系的信号</div>
        <div class="radar-reco"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('.radar-input');
  const results = overlay.querySelector('.radar-results');
  const noSig = overlay.querySelector('.radar-no-signal');

  overlay.querySelector('.radar-close').addEventListener('click', closeRadar);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeRadar();
      return;
    }
    // 点击雷达盘内非交互区时重新聚焦输入框，解决"点别处后无法输入"
    if (e.target.closest('.radar-scope') && !e.target.closest('button, .radar-card, .chip, a')) {
      input.focus();
    }
  });
  input.addEventListener('input', () => runSearch(input.value.trim(), results, noSig));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRadar();
  });
}

function runSearch(q, results, noSig) {
  results.innerHTML = '';
  noSig.hidden = true;
  if (!q) return;
  const matches = data
    .map((n) => ({ n, s: scoreNote(n, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 10);

  if (matches.length === 0) {
    noSig.hidden = false;
    noSig.classList.remove('flash');
    void noSig.offsetWidth;
    noSig.classList.add('flash');
    // 邻近星系 = 热门标签推荐
    const reco = overlay.querySelector('.radar-reco');
    const tags = {};
    data.forEach((n) => (n.tags || []).forEach((t) => (tags[t] = (tags[t] || 0) + 1)));
    const top = Object.entries(tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    reco.innerHTML = top
      .map(([t]) => `<span class="chip" data-reco="${t}"># ${t}</span>`)
      .join('');
    reco.querySelectorAll('[data-reco]').forEach((el) =>
      el.addEventListener('click', () => {
        results.parentElement.querySelector('.radar-input').value = el.dataset.reco;
        runSearch(el.dataset.reco, results, noSig);
      })
    );
    return;
  }

  const scope = overlay.querySelector('.radar-scope');
  const R = scope.clientWidth / 2;
  matches.forEach(({ n, s }, i) => {
    const card = document.createElement('a');
    card.className = 'radar-card';
    card.href = n.url;
    card.innerHTML = `<b>${n.title}</b><div class="chip"># ${n.category}</div>
      <div style="opacity:.7;margin-top:4px;font-size:12px">${n.summary.slice(0, 48)}…</div>`;
    results.appendChild(card);
    // 目标位置：螺旋排布，相关度越高越靠中心
    const ang = i * 2.399;
    const rad = Math.min(R * 0.78, 70 + (matches.length - i) * 16);
    const tx = R + Math.cos(ang) * rad - 100;
    const ty = R + Math.sin(ang) * rad - 40;
    // 起始：从屏幕外缘被引力牵引飞入
    const sa = Math.random() * Math.PI * 2;
    gsap.fromTo(
      card,
      { x: Math.cos(sa) * R * 1.6, y: Math.sin(sa) * R * 1.6, opacity: 0, scale: 0.6 },
      {
        x: tx,
        y: ty,
        opacity: 1,
        scale: 0.8 + (s / 12) * 0.25,
        duration: 0.7,
        ease: 'power3.out',
        delay: i * 0.04,
      }
    );
    card.addEventListener('mouseenter', () =>
      blipThrottled(620, panFromX(card.getBoundingClientRect().left))
    );
  });
}

function openRadar() {
  if (!overlay) buildOverlay();
  overlay.classList.add('open');
  loadData().then(() => {
    const inp = overlay && overlay.querySelector('.radar-input');
    if (inp) inp.focus();
  });
  blipThrottled(900, 0);
}
function closeRadar() {
  if (!overlay) return;
  const o = overlay;
  overlay = null; // 置空，下次打开会重建全新 overlay（彻底消除残留扫描圈/旧 input 失效）
  o.classList.remove('open');
  // 等淡出动画结束再移除 DOM
  setTimeout(() => {
    if (o && o.parentNode) o.parentNode.removeChild(o);
  }, 300);
}

export function initRadar() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-radar]');
    if (t) {
      e.preventDefault();
      openRadar();
    }
  });
}
