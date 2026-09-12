#!/usr/bin/env node
/**
 * 新建文章脚手架
 *
 * 用法：
 *   npm run new -- "文章标题"
 *   npm run new -- "上下文压缩的三个抓手" --category=Token优化 --tags=Token,压缩 --slug=context-compression
 *   npm run new -- "标题" --series="Agent 工程化" --dry-run   # 只看不写
 *
 * 说明：
 *   - 生成 src/content/notes/<分类>/<短名>.md，带完整 frontmatter 注释与正文骨架
 *   - 中文标题无法自动推导英文短名，必须用 --slug 指定（URL 需要）
 *   - 文件已存在时不覆盖，直接报错退出
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTES_DIR = join(ROOT, 'src', 'content', 'notes');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-n');
const positional = args.filter((a) => !a.startsWith('--'));
const opt = (key, fallback = '') => {
  const hit = args.find((a) => a.startsWith(`--${key}=`));
  return hit ? hit.slice(key.length + 3) : fallback;
};

const title = positional[0];
if (!title) {
  console.error('用法: npm run new -- "文章标题" [--category=分类] [--tags=标签1,标签2] [--slug=english-slug] [--series=系列名] [--dry-run]');
  process.exit(1);
}

const hasCJK = /[一-龥]/.test(title);
const slugFromArg = opt('slug');
const autoSlug = String(title)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
const slug = slugFromArg || (hasCJK ? '' : autoSlug);

if (!slug) {
  console.error('✗ 标题含中文，无法自动生成英文短名（URL 需要）。请用 --slug=english-name 指定，例如：');
  console.error(`  npm run new -- "${title}" --slug=my-article-name`);
  process.exit(1);
}

const category = opt('category', 'Agent');
const tags = opt('tags')
  .split(/[,，]/)
  .map((s) => s.trim())
  .filter(Boolean);
const series = opt('series');
// 用本地时区日期（toISOString 是 UTC，北京时间凌晨会写成前一天）
const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
  d.getDate()
).padStart(2, '0')}`;

const file = join(NOTES_DIR, category, `${slug}.md`);
if (!dryRun && existsSync(file)) {
  console.error(`✗ 文件已存在，不覆盖：${file}`);
  process.exit(1);
}

const fm = [
  '---',
  `title: "${title.replace(/"/g, '\\"')}"`,
  `date: ${today}`,
  `category: ${category}`,
  `tags: [${tags.join(', ')}]`,
  'summary: 一句话摘要，显示在卡片、RSS 和分享卡片上（建议 30~60 字）。',
  'maturity: growing   # draft(草稿🌱) / growing(成长中🌿) / polished(已打磨💎)',
  'featured: false     # true 则首页优先展示',
  'draft: false        # true 不发布，只在 /drafts 可见',
  '# updated: ' + today + '  # 修订后取消注释并改日期：文章页显示「更新于」并进 /changelog',
  series ? `series: ${series}` : '# series: 系列名    # 归入系列后可加 seriesOrder: 1',
  '# cover: /images/xxx.png',
  '---',
].join('\n');

const body = `
# ${title}

> 一句话说明这篇文章解决什么问题。

## 背景

为什么会有这篇笔记。

## 要点

1. 
2. 

## 小结

- 
`;

const content = `${fm}\n${body}`;

if (dryRun) {
  console.log('— dry-run，未写入文件 —\n');
  console.log(`将创建：${file}\n`);
  console.log(content);
  process.exit(0);
}

mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, content, 'utf8');

console.log(`✓ 已创建 ${file}`);
console.log(`  线上地址：/notes/${category}/${slug}/`);
console.log('\n下一步：');
console.log('  1) 编辑内容，填好 summary / tags');
console.log('  2) npm run dev 预览');
console.log('  3) npm run og 生成分享图（有新文章时）');
console.log(`  4) npm run release -- "新增文章：${title}"   # 一键发布`);
