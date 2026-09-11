// Mermaid 图表：仅在页面含 ```mermaid 代码块时，按需从 CDN 加载 mermaid（ESM），
// 把 <pre class="language-mermaid"> 替换为 <div class="mermaid"> 后渲染。零构建期依赖。
let started = false;

export function initMermaid() {
  // shiki 的 addLanguageClass 把 language-xxx 加在 <code> 上，<pre> 则由本站的
  // rehypeCodeMeta 插件写入 data-language，两者皆可定位 mermaid 块。
  const blocks = Array.from(document.querySelectorAll('.content pre[data-language="mermaid"]'));
  if (!blocks.length) return;

  blocks.forEach((pre) => {
    const code = pre.querySelector('code');
    const text = code ? code.textContent : pre.textContent;
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = text;
    pre.replaceWith(div);
  });

  if (started) return;
  started = true;

  const theme =
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    (localStorage.getItem('theme') || 'auto') === 'dark'
      ? 'dark'
      : 'default';

  import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')
    .then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme,
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      mermaid.run({ querySelector: '.content .mermaid' });
    })
    .catch(() => {
      // 加载失败（如离线 / CDN 不可达）：保留原始代码文本，便于阅读
      document.querySelectorAll('.content .mermaid').forEach((d) => {
        const pre = document.createElement('pre');
        pre.className = 'language-mermaid';
        pre.textContent = d.textContent;
        d.replaceWith(pre);
      });
    });
}
