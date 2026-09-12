/* PWA Service Worker：首次访问后离线可读、回访秒开。
 * 策略（保守，避免缓存脏数据）：
 *  - 页面导航：网络优先，失败回落缓存（内容更新能及时拿到，断网时仍可读）
 *  - 静态资源（/_astro/*、js/css/字体/图片）：缓存优先 + 后台更新
 *  - /api/*（Pages Function，如访客计数）不接管，必须实时
 *  - 跨域请求（giscus、Cloudflare beacon）不接管
 */

const VERSION = 'v1';
const CORE = `core-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CORE)
      .then((cache) => cache.addAll(['/']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CORE && k !== RUNTIME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isAsset(pathname) {
  return (
    pathname.startsWith('/_astro/') ||
    /\.(?:js|mjs|css|woff2?|ttf|otf|svg|png|jpe?g|webp|avif|gif|ico|json)$/i.test(pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return; // 跨域不接管
  if (url.pathname.startsWith('/api/')) return; // Pages Function 需实时

  // 页面导航：网络优先 + 缓存兜底
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  if (isAsset(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
