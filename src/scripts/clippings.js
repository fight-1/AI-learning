// 本地摘录：选中 .content 正文 → 浮动「📌 摘录」按钮 → 存入 localStorage（不上传）。
// 另导出 getClippings / removeClipping / clearClippings 供 /clippings 页面调用。

const KEY = 'clippings';
const MAX = 200;

const load = () => {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};
const save = (a) => localStorage.setItem(KEY, JSON.stringify(a));

export function getClippings() {
  return load();
}
export function removeClipping(id) {
  save(load().filter((c) => c.id !== id));
  document.dispatchEvent(new CustomEvent('clippings:changed'));
}
export function clearClippings() {
  save([]);
  document.dispatchEvent(new CustomEvent('clippings:changed'));
}

let toastTimer = null;
function toast(msg) {
  let t = document.querySelector('.clip-toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'clip-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => (t.style.opacity = '1'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
  }, 1600);
}

export function initClippings() {
  const content = document.querySelector('.content');
  if (!content) return;

  let btn = null;
  const ensureBtn = () => {
    if (btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'clip-fab';
    btn.textContent = '📌 摘录';
    btn.setAttribute('aria-label', '把选中文字存为本地摘录');
    btn.addEventListener('click', saveSelection);
    document.body.appendChild(btn);
    return btn;
  };
  const hideBtn = () => {
    if (btn) btn.style.display = 'none';
  };
  const showBtn = (x, y) => {
    const b = ensureBtn();
    b.style.display = 'block';
    b.style.left = Math.min(x, window.innerWidth - 96) + 'px';
    b.style.top = y + 10 + 'px';
  };

  // 选区必须落在 .content 内
  const selectionInContent = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return '';
    const text = sel.toString().trim();
    if (!text) return '';
    let node = sel.anchorNode;
    while (node) {
      if (node === content) return text;
      node = node.parentNode;
    }
    return '';
  };

  document.addEventListener('mouseup', (e) => {
    setTimeout(() => {
      const text = selectionInContent();
      if (text) showBtn(e.clientX, e.clientY);
      else hideBtn();
    }, 0);
  });
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) hideBtn();
  });

  function saveSelection() {
    const text = selectionInContent();
    if (!text) return;
    const items = load();
    items.unshift({
      id: 'cl' + Date.now(),
      text,
      title: document.title,
      url: location.pathname,
      ts: new Date().toISOString(),
    });
    save(items.slice(0, MAX));
    hideBtn();
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    toast('已存为本地摘录');
    document.dispatchEvent(new CustomEvent('clippings:changed'));
  }
}
