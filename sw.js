/* Service worker: ทำให้วงล้อสุ่มใช้งานออฟไลน์ได้
   เมื่อแก้ไฟล์ใดๆ แล้วนำขึ้นเว็บใหม่ ให้เปลี่ยนเลข VERSION ด้านล่าง เพื่อให้เครื่องผู้ใช้ดึงไฟล์ชุดใหม่ */
const VERSION = '2';
const CACHE = 'spin-wheel-' + VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./fonts/Inter-Bold.subset.woff",
  "./fonts/Inter-ExtraBold.subset.woff"
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // เก็บทีละไฟล์ ถ้าไฟล์ไหนหาย ไฟล์อื่นก็ยังถูกเก็บ
    await Promise.all(ASSETS.map(url => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('spin-wheel-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function handleNavigate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match('./index.html');
  // เปิดจากแคชทันที แล้วอัปเดตไฟล์ใหม่เงียบๆ เมื่อมีอินเทอร์เน็ต (จะเห็นเวอร์ชันใหม่ในการเปิดครั้งถัดไป)
  const network = fetch(event.request).then(res => {
    if (res && res.ok) cache.put('./index.html', res.clone());
    return res;
  }).catch(() => null);
  event.waitUntil(network);
  return cached || (await network) || new Response('ออฟไลน์อยู่ และยังไม่เคยบันทึกแอปไว้ในเครื่อง', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { event.respondWith(handleNavigate(event)); return; }
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    } catch (e) {
      return new Response('', { status: 504 });
    }
  })());
});
