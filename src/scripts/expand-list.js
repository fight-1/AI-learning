// 「默认展示前 5 条 + 展开全部」折叠列表
// 内容在构建期已全部渲染进 HTML，展开只是切换 data-collapse 属性（纯 CSS 显隐），
// 因此无网络请求、离线可用、SEO 也能抓到全部条目。
// 用法：容器加 data-collapse="on" data-total="N"（容器内第 6 条起加 .is-extra），
// 按钮加 data-expand。
export function initExpand() {
  document.querySelectorAll('[data-expand]').forEach((btn) => {
    // 按钮可能在容器内，也可能在容器后（用 previousElementSibling 兜底）
    let box = btn.closest('[data-collapse]');
    if (!box && btn.previousElementSibling && btn.previousElementSibling.hasAttribute('data-collapse')) {
      box = btn.previousElementSibling;
    }
    if (!box) return;
    const total = box.getAttribute('data-total') || '';
    btn.addEventListener('click', () => {
      const collapsed = box.getAttribute('data-collapse') === 'on';
      box.setAttribute('data-collapse', collapsed ? 'off' : 'on');
      btn.textContent = collapsed ? '收起' : `展开全部（${total} 篇）`;
      btn.classList.toggle('expanded', collapsed);
      btn.setAttribute('aria-expanded', collapsed ? 'true' : 'false');
    });
    btn.setAttribute('aria-expanded', 'false');
  });
}
