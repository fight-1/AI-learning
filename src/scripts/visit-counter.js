// 访客计数：调用 /api/visitors（Cloudflare Pages Function + KV）
// 成功显示「访客 N · 浏览 M」；失败（未绑 KV / 本地预览无函数）静默留空。
function initVisitorCounter() {
  const el = document.getElementById('visit-counter');
  if (!el) return;

  const fill = (s) => {
    if (!s || s.noKV) {
      el.textContent = '';
      return;
    }
    const n = (x) => (x || 0).toLocaleString('zh-CN');
    el.textContent = `访客 ${n(s.uv)} · 浏览 ${n(s.pv)}`;
  };

  const send = () => {
    fetch('/api/visitors', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      keepalive: true,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(fill)
      .catch(() => {
        el.textContent = '';
      });
  };

  if (document.readyState === 'complete') send();
  else window.addEventListener('load', send, { once: true });
}

initVisitorCounter();
