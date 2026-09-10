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
  if (!env || !env.VISITOR_KV) return { pv: 0, uv: 0, noKV: true };
  try {
    return (await env.VISITOR_KV.get('stats', { type: 'json' })) || { pv: 0, uv: 0 };
  } catch {
    return { pv: 0, uv: 0 };
  }
}

// 北京时间（GMT+8）日期字符串 YYYY-MM-DD
function beijingDate() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function onRequestGet({ env }) {
  return json(await readStats(env));
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
