// Cloudflare Pages Function: /api/visitors
// GET  -> 返回当前 { pv, uv }
// POST -> 浏览量 +1；当天首次访问（按北京时间日期去重）访客数 +1，并下发 visitor_day cookie
// 机器人 UA 不计入。需在 Pages 项目绑定 KV，变量名固定为 VISITOR_KV。

function json(data, extra) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(extra || {}),
    },
  });
}

async function readStats(env) {
  if (!env || !env.VISITOR_KV) return { pv: 0, uv: 0, pages: {}, noKV: true };
  try {
    const s = (await env.VISITOR_KV.get('stats', { type: 'json' })) || { pv: 0, uv: 0, pages: {} };
    if (!s.pages || typeof s.pages !== 'object') s.pages = {};
    return s;
  } catch {
    return { pv: 0, uv: 0, pages: {} };
  }
}

// 归一化路径：去 query/hash、去结尾斜杠、限制长度
function normalizePath(p) {
  try {
    const u = new URL(String(p || '/'), 'https://x.invalid');
    let path = u.pathname.replace(/\/+$/, '') || '/';
    if (!path.startsWith('/')) path = '/' + path;
    return path.slice(0, 200);
  } catch (e) {
    return '/';
  }
}

// 北京时间（GMT+8）日期字符串 YYYY-MM-DD
function beijingDate() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function onRequestGet({ request, env }) {
  const stats = await readStats(env);
  // ?top=N -> 返回 PV 最高的 N 个页面路径（供「热门文章」使用）
  const url = new URL(request.url);
  const topN = parseInt(url.searchParams.get('top') || '', 10);
  if (topN > 0) {
    const top = Object.entries(stats.pages || {})
      .map(([path, pv]) => ({ path, pv }))
      .sort((a, b) => b.pv - a.pv)
      .slice(0, Math.min(topN, 20));
    return json({ pv: stats.pv || 0, uv: stats.uv || 0, top, noKV: !!stats.noKV });
  }
  return json(stats);
}

export async function onRequestPost({ request, env }) {
  const ua = request.headers.get('User-Agent') || '';
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit/i.test(ua)) {
    return json(await readStats(env)); // 爬虫不计
  }
  const cookie = request.headers.get('Cookie') || '';
  const today = beijingDate();
  // 取浏览器上次计入 UV 的日期（北京时间）
  const m = cookie.match(/(?:^|;\s*)visitor_day=([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  const lastDay = m ? m[1] : '';
  const isNewDay = lastDay !== today; // 当天首次访问才计一次 UV

  const stats = await readStats(env);
  if (stats.noKV) return json(stats);

  // 按路径累计 PV（用于「热门文章」）：优先取前端上报的 path，回退 Referer
  let rawPath = '';
  try {
    const body = await request.json();
    rawPath = (body && body.path) || '';
  } catch (e) {}
  if (!rawPath) {
    const ref = request.headers.get('Referer') || '';
    if (ref) rawPath = normalizePath(ref);
  }
  const path = normalizePath(rawPath || '/');
  stats.pages[path] = (stats.pages[path] || 0) + 1;
  // 控制体积：路径数过多时只保留 PV 最高的若干条
  const keys = Object.keys(stats.pages);
  if (keys.length > 300) {
    stats.pages = Object.fromEntries(
      keys
        .map((k) => [k, stats.pages[k]])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 150)
    );
  }

  stats.pv = (stats.pv || 0) + 1;
  if (isNewDay) stats.uv = (stats.uv || 0) + 1;
  await env.VISITOR_KV.put('stats', JSON.stringify(stats));

  const headers = {};
  if (isNewDay) {
    // Cookie 标记今天已计入；跨天（北京时间）后自动重新计数
    headers['Set-Cookie'] =
      'visitor_day=' + today + '; Path=/; Max-Age=86400; SameSite=Lax';
  }
  return json(stats, headers);
}
