import rss from '@astrojs/rss';
import { getNotes } from '../lib/notes';

export async function GET(context) {
  const notes = await getNotes();
  const site = context.site || new URL('https://fight-1.example.com');
  const selfUrl = new URL('/rss.xml', site).toString();
  return rss({
    title: 'fight-1 的 AI 学习笔记',
    description: 'Agent / Skill / MCP / LLM / Token 优化 / UI 设计 等 AI 学习资料汇总',
    site: context.site,
    trailingSlash: true,
    items: notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      description: n.data.summary,
      link: `/notes/${n.id}/`,
      categories: [n.data.category, ...n.data.tags],
    })),
    customData: `<language>zh-CN</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate><atom:link href="${selfUrl}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>`,
  });
  // 注意：不要给 rss.xml 注入 XSL 样式表 —— 2026 年起 Chrome/Edge 已移除 XSLT（XSLTProcessor 不存在），
  // 带 xml-stylesheet PI 的 XML 在新内核里会退化成纯文本源码显示。浏览器友好预览改由 /subscribe 页承担。
}
