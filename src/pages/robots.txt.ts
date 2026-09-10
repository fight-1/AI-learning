import type { APIRoute } from 'astro';

// 静态构建时预渲染为 /robots.txt；Sitemap 地址跟随 astro.config 的 site。
export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://ai-learning-3wy.pages.dev')).href.replace(/\/$/, '');
  const body = `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
