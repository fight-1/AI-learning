// 文章索引：{ path, title, category }[]
// 供「热门文章」把 KV 里按路径累计的 PV 映射成标题（客户端 fetch 后 join）。
// path 不带结尾斜杠，与 visitors.js 中 normalizePath 的结果保持一致。
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const notes = await getCollection('notes', ({ data }) => !data.draft);
  const list = notes
    .slice()
    .sort((a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf())
    .map((n) => ({
      path: '/notes/' + n.id,
      title: n.data.title,
      category: n.data.category || '',
    }));
  return new Response(JSON.stringify(list), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
