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

// 双链 wiki-link：把正文里的 [[slug]] / [[slug|标题]] 转成站内链接 /notes/<slug>/。
// 跳过代码块与已有链接内的文本，避免误伤；零新增依赖（手写 mdast 遍历）。
function remarkWikiLinks() {
  const WIKILINK = /\[\[([^\]|\s]+)(?:\|([^\]]+))?\]\]/g;
  const walk = (node) => {
    if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;
    const out = [];
    for (const child of node.children) {
      if (!child) { out.push(child); continue; }
      // 链接/图片节点内部的文本不再处理
      if (child.type === 'link' || child.type === 'linkReference' || child.type === 'image' || child.type === 'imageReference') {
        out.push(child);
        continue;
      }
      if (child.type === 'text') {
        const value = child.value;
        if (WIKILINK.test(value)) {
          WIKILINK.lastIndex = 0;
          let last = 0;
          let m;
          while ((m = WIKILINK.exec(value))) {
            if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
            const slug = m[1].trim();
            const label = (m[2] || slug.split('/').pop()).trim();
            out.push({
              type: 'link',
              url: '/notes/' + slug + '/',
              data: { hProperties: { 'data-wikilink': slug } },
              children: [{ type: 'text', value: label }],
            });
            last = m.index + m[0].length;
          }
          if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
          continue;
        }
      }
      walk(child);
      out.push(child);
    }
    node.children = out;
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
    remarkPlugins: [remarkWikiLinks],
  },
  scopedStyleStrategy: 'class',
});
