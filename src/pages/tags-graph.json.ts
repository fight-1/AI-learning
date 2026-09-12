// 构建期生成标签关系图（节点=标签/热度，边=同篇共现）—— 供引力星轨与关系球使用
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const notes = await getCollection('notes', (n) => !n.data.draft);
  const counts: Record<string, number> = {};
  const co: Record<string, Record<string, number>> = {};
  for (const n of notes) {
    const tags = n.data.tags || [];
    tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const a = tags[i],
          b = tags[j];
        co[a] = co[a] || {};
        co[a][b] = (co[a][b] || 0) + 1;
        co[b] = co[b] || {};
        co[b][a] = (co[b][a] || 0) + 1;
      }
    }
  }
  const nodes = Object.entries(counts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const edges: [number, number, number][] = [];
  for (const [a, m] of Object.entries(co)) {
    for (const [b, w] of Object.entries(m)) {
      const ia = idx.get(a),
        ib = idx.get(b);
      if (ia !== undefined && ib !== undefined && ia < ib)
        edges.push([ia, ib, w]);
    }
  }
  return new Response(JSON.stringify({ nodes, edges }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
