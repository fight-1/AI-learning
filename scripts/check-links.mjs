#!/usr/bin/env node
/**
 * 站内死链检查：扫描 dist/**\/*.html 里的 href / src，验证目标文件是否存在。
 * 支持：
 *   - 绝对路径   /notes/xxx/
 *   - 相对路径   ../mcp/xxx  ./xxx   （按所在页面目录解析——之前文章里
 *                [MCP](../mcp/xxx) 因少写一层 ../ 导致 404，就是这类问题）
 *   - 导出的 md  /notes/xxx.md
 * 外链（http/https/mailto）与锚点跳过。
 * 用法：npm run build 后执行  node scripts/check-links.mjs
 * 发现死链时退出码为 1，可直接接进 CI。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(ROOT)) {
  console.error('未找到 dist/，请先 npm run build');
  process.exit(2);
}

function targetExists(pathname) {
  const noSlash = pathname.replace(/\/$/, '');
  const cands = [
    pathname,
    pathname + 'index.html',
    pathname + '/index.html', // /notes -> /notes/index.html（CF 会 301 补斜杠）
    noSlash + '.html',
    noSlash + '.md',
  ];
  return cands.some((c) => {
    try {
      const p = path.join(ROOT, c);
      return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
}

const broken = new Map();
let checked = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      walk(fp);
      continue;
    }
    if (!name.endsWith('.html')) continue;
    const pagePath = '/' + path.relative(ROOT, fp).split(path.sep).join('/');
    let html = fs.readFileSync(fp, 'utf8');
    // 剔除 <script>/<style>：里面的 JS 模板字符串（如 '<a href="'+url+'">'）不是真实链接
    html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
    const re = /(?:href|src)="([^"#]*)"/g;
    let m;
    while ((m = re.exec(html))) {
      const raw = m[1];
      if (!raw) continue;
      if (/^(https?:|mailto:|javascript:|data:|\/\/)/i.test(raw)) continue;
      let u;
      try {
        u = new URL(raw, 'http://localhost' + pagePath);
      } catch {
        continue;
      }
      if (u.origin !== 'http://localhost') continue; // 外链
      const pathname = decodeURIComponent(u.pathname);
      if (!pathname.startsWith('/')) continue;
      checked++;
      if (!targetExists(pathname)) {
        if (!broken.has(pathname)) broken.set(pathname, new Set());
        broken.get(pathname).add(pagePath);
      }
    }
  }
}

walk(ROOT);

console.log(`检查内部链接：${checked} 个`);
if (broken.size === 0) {
  console.log('✅ 未发现站内死链');
  process.exit(0);
}
console.error(`❌ 发现 ${broken.size} 个死链：`);
for (const [target, pages] of broken) {
  console.error(`  ${target}`);
  for (const p of pages) console.error(`    <- ${p}`);
}
process.exit(1);
