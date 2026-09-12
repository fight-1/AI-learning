import type { APIRoute } from 'astro';
import { getNotes } from '../lib/notes';

export const GET: APIRoute = async () => {
  const notes = await getNotes();
  const data = notes.map((n) => ({
    id: n.id,
    title: n.data.title,
    summary: n.data.summary,
    category: n.data.category,
    tags: n.data.tags,
    url: `/notes/${n.id}`,
    date: n.data.date.toISOString().slice(0, 10),
  }));
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
