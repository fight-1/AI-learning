import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// 自生成 sitemap（避免依赖 @astrojs/sitemap 在受限环境无法安装）。
// 静态构建时预渲染为 /sitemap.xml；跟随 astro.config 的 site。
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://ai-learning-3wy.pages.dev')).href.replace(/\/$/, '');

  // 公开、可被索引的静态页（排除 console / favorites 等个人页）
  const staticPaths = ['', '/notes', '/categories', '/tags', '/subscribe', '/about', '/search'];

  const notes = await getCollection('notes', ({ data }) => !data.draft);
  const notePaths = notes.map((n) => `/notes/${n.id}`);

  const urls = [...staticPaths, ...notePaths].map((p) => `${base}${p}/`);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
