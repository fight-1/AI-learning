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
