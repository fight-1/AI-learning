// 构建体积预算：超过阈值则失败（退出码 1），可接 CI。
// 用法：node scripts/size-budget.mjs [--max=8M]
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const MAX = parseMax(process.argv.find((a) => a.startsWith('--max='))?.slice(6) || '8M');

function parseMax(s) {
  const m = /(\d+(?:\.\d+)?)\s*(B|K|M|G)/i.exec(s);
  if (!m) return 8 * 1024 * 1024;
  const n = parseFloat(m[1]);
  return n * ({ B: 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3 }[m[2].toUpperCase()]);
}

function walk(dir) {
  let total = 0;
  const top = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      total += walk(p);
    } else {
      total += st.size;
      top.push({ p, size: st.size });
    }
  }
  return total;
}

function fmt(b) {
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + ' GB';
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(2) + ' MB';
  return (b / 1024).toFixed(1) + ' KB';
}

if (!statSync(DIST, { throwIfNoEntry: false })) {
  console.error('❌ 找不到 dist/，请先运行 npm run build');
  process.exit(1);
}

const total = walk(DIST);
const pct = ((total / MAX) * 100).toFixed(1);
console.log(`📦 构建产物体积：${fmt(total)}（预算 ${fmt(MAX)}，占用 ${pct}%）`);

if (total > MAX) {
  console.error(`❌ 超出体积预算！${fmt(total)} > ${fmt(MAX)}`);
  process.exit(1);
}
console.log('✅ 体积预算内');
