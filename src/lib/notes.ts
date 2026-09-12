import { getCollection, type CollectionEntry } from 'astro:content';

export type Note = CollectionEntry<'notes'>;

export async function getNotes(): Promise<Note[]> {
  return (await getCollection('notes', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function readingTime(text: string): number {
  const cn = (text.match(/[一-龥]/g) || []).length;
  const words = (text.replace(/[一-龥]/g, ' ').match(/\S+/g) || []).length;
  return Math.max(1, Math.round(cn / 350 + words / 200));
}

export function uniqueCategories(notes: Note[]): string[] {
  return [...new Set(notes.map((n) => n.data.category))];
}

export function uniqueTags(notes: Note[]): string[] {
  return [...new Set(notes.flatMap((n) => n.data.tags))].sort();
}

// 双链反向链接：扫描所有文章的原始正文，找出引用了 `[[slug]]` 的文章（不含自身）。
const WIKILINK_RE = /\[\[([^\]|\s]+)(?:\|[^\]]+)?\]\]/g;
export function getBacklinks(slug: string, notes: Note[]): Note[] {
  return notes.filter((n) => {
    if (n.id === slug) return false;
    const body = (n.body as string) || '';
    let m: RegExpExecArray | null;
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(body))) {
      if (m[1].trim() === slug) return true;
    }
    return false;
  });
}

// 系列聚合：按 series 分组，组内按 seriesOrder → date 排序。
export function getSeriesMap(notes: Note[]): Map<string, Note[]> {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const s = n.data.series;
    if (!s) continue;
    (map.get(s) || map.set(s, []).get(s)!).push(n);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.data.seriesOrder - b.data.seriesOrder || a.data.date.valueOf() - b.data.date.valueOf());
  }
  return map;
}

// 同系列内相邻篇：返回 { list, index, prev, next }；不在系列则返回 null。
export function getSeriesContext(slug: string, notes: Note[]): { name: string; list: Note[]; index: number; prev: Note | null; next: Note | null } | null {
  const note = notes.find((n) => n.id === slug);
  if (!note || !note.data.series) return null;
  const list = getSeriesMap(notes).get(note.data.series) || [];
  const index = list.findIndex((n) => n.id === slug);
  if (index < 0) return null;
  return {
    name: note.data.series,
    list,
    index,
    prev: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
  };
}
