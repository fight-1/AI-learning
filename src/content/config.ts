import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // 最后更新时间（可选）。不填则与 date 相同；填写后文章页显示「更新于 X」，
    // 且 JSON-LD 的 dateModified 会用它（不填会导致结构化数据的修改时间不准）。
    updated: z.coerce.date().optional(),
    // 成熟度：草稿 / 成长中 / 已打磨。用于让读者判断可信度，可按 maturity 筛选。
    maturity: z.enum(['draft', 'growing', 'polished']).default('growing'),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    summary: z.string().default(''),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});

export const collections = { notes };
