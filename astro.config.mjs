import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

// 站点地址：影响 RSS 与站内绝对链接。
// 当前为 Cloudflare Pages 默认域名；以后绑定自定义域名（如 notes.fight-1.dev）时改这里即可。
const SITE = 'https://ai-learning-3wy.pages.dev';

// 代码块元信息：把围栏语言与 meta 里的 title="xxx" 写到 <pre> 的 data-* 属性，
// 供前端（fx.js）渲染「语言标签 + 文件名」块头。手写递归遍历，零新增依赖。
function rehypeCodeMeta() {
  const walk = (node) => {
    if (!node || !Array.isArray(node.children)) return;
    for (const child of node.children) {
      if (child && child.type === 'element' && child.tagName === 'pre') {
        const code = Array.isArray(child.children)
          ? child.children.find((c) => c && c.type === 'element' && c.tagName === 'code')
          : null;
        if (code) {
          const meta = String((code.data && code.data.meta) || (code.properties && code.properties.metastring) || '');
          const cls = [].concat((code.properties && code.properties.className) || []).map(String);
          const langCls = cls.find((c) => c.startsWith('language-'));
          child.properties = child.properties || {};
          if (langCls) child.properties.dataLanguage = langCls.slice('language-'.length);
          // 围栏写法：```ts title="src/main.ts"
          const m = /title="([^"]+)"/.exec(meta);
          if (m) child.properties.dataTitle = m[1];
        }
      }
      walk(child);
    }
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  site: SITE,
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
      // 让高亮产物保留 language-xxx class，前端可据此推断语言
      addLanguageClass: true,
    },
    rehypePlugins: [rehypeCodeMeta],
  },
  scopedStyleStrategy: 'class',
});
