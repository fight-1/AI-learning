// Cloudflare Pages Function: /api/visitors
// GET  -> 返回当前 { pv, uv }
// POST -> 浏览量 +1；无 visitor_id cookie 时访客数 +1，并下发 cookie（1 年）
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

export async function onRequestGet({ env }) {
  return json(await readStats(env));
}

export async function onRequestPost({ request, env }) {
  const ua = request.headers.get('User-Agent') || '';
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit/i.test(ua)) {
    return json(await readStats(env)); // 爬虫不计
  }
  const cookie = request.headers.get('Cookie') || '';
  const hadVisitor = /(^|;\s*)visitor_id=/.test(cookie);
  const stats = await readStats(env);
  if (stats.noKV) return json(stats);
  stats.pv = (stats.pv || 0) + 1;
  if (!hadVisitor) stats.uv = (stats.uv || 0) + 1;
  await env.VISITOR_KV.put('stats', JSON.stringify(stats));
  const headers = {};
  if (!hadVisitor) {
    const id =
      globalThis.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2);
    headers['Set-Cookie'] =
      'visitor_id=' + id + '; Path=/; Max-Age=31536000; SameSite=Lax';
  }
  return json(stats, headers);
}
