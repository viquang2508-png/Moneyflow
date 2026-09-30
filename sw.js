/* Service Worker cho MoneyFlow — cache tài nguyên để dùng offline / mở nhanh từ màn hình chính.

   ★ Sửa 2 điểm so với bản gốc:
   1) Tên file HTML: đổi theo đúng bản đang dùng (xem APP_HTML bên dưới) —
      bản gốc trỏ cứng 'moneyflow_V18_1.html', nếu đổi tên file hoặc lên
      version mới mà quên sửa theo, app sẽ không cache/không có trang
      offline fallback đúng, và có thể "kẹt" ở bản cũ trên máy đã cài PWA.
   2) Cách cache lúc install: bản gốc dùng cache.addAll(ASSETS) — API này
      TẤT CẢ-HOẶC-KHÔNG-GÌ: nếu chỉ 1 URL trong danh sách lỗi (kể cả một
      CDN ngoài tạm thời chậm/lỗi mạng), toàn bộ bước install thất bại và
      Service Worker không được cài — kể cả file HTML chính, quan trọng
      nhất, cũng không được cache. Đổi sang cache.add() riêng từng file
      trong vòng lặp, mỗi cái có catch riêng — 1 CDN lỗi không kéo sập
      toàn bộ, và file HTML chính (ưu tiên cao nhất) luôn được thử cache
      độc lập với các CDN ngoài. */

const CACHE = 'moneyflow-v2'; // ĐỔI số này mỗi lần lên version — nếu không, máy đã cài vẫn chạy bản cũ trong bộ nhớ đệm
const APP_HTML = './moneyflow_V18_3.html'; // ĐỔI DÒNG NÀY khi lên version mới
const ASSETS = [
  APP_HTML,
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(err => {
            // 1 tài nguyên lỗi (thường là CDN ngoài) không được làm sập cả install —
            // ghi log để biết, nhưng vẫn tiếp tục cache các tài nguyên còn lại.
            console.warn('[SW] Không cache được', url, err);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match(APP_HTML)))
  );
});
