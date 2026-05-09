const CACHE_NAME = 'minty-commissions-v1';
const urlsToCache = ['./index.html'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.map(name => name !== CACHE_NAME && caches.delete(name)))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Background notification check
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-deadlines') {
    event.waitUntil(checkDeadlines());
  }
});

async function checkDeadlines() {
  const db = await openDB();
  const requests = await loadAll(db);
  const today = new Date(); today.setHours(0,0,0,0);
  
  const overdue = requests.filter(r => {
    if (r.status === 'done' || !r.deadline) return false;
    const dl = new Date(r.deadline); dl.setHours(0,0,0,0);
    return dl < today;
  });

  if (overdue.length) {
    self.registration.showNotification('🐉 Zaległe requesty!', {
      body: `${overdue.length} ${overdue.length === 1 ? 'request' : 'requestów'} po deadlinie`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🐉</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔴</text></svg>',
      tag: 'deadline-alert',
      requireInteraction: false
    });
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('minty-commissions', 1);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}

function loadAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('requests', 'readonly');
    const req = tx.objectStore('requests').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}
