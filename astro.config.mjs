import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

// 站点地址在部署时再改（影响 RSS / 站内绝对链接）
const SITE = 'https://fight-1.example.com';

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
