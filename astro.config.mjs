import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

// 站点地址：影响 RSS 与站内绝对链接。
// 当前为 Cloudflare Pages 默认域名；以后绑定自定义域名（如 notes.fight-1.dev）时改这里即可。
const SITE = 'https://ai-learning-3wy.pages.dev';

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
    },
  },
  scopedStyleStrategy: 'class',
});
