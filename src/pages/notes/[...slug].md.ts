// 导出原文 Markdown：/notes/<slug>.md
// 构建期把每篇文章的源文件内容原样输出为静态 .md，实现「本站导出」，
// 不依赖 GitHub 或任何外部服务。草稿（draft: true）不导出。
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';

export const getStaticPaths = async () => {
  const notes = await getCollection('notes', ({ data }) => !data.draft);
  return notes.map((n) => ({ params: { slug: n.id } }));
};

export const GET: APIRoute = ({ params }) => {
  const id = String(params.slug || '');
  const base = path.join(process.cwd(), 'src', 'content', 'notes');
  // 源文件可能是 .md 或 .mdx，两者都支持
  const file = ['.md', '.mdx']
    .map((ext) => path.join(base, id + ext))
    .find((p) => fs.existsSync(p));
  if (!file) return new Response('Not found\n', { status: 404 });

  const raw = fs.readFileSync(file, 'utf-8');
  return new Response(raw, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
