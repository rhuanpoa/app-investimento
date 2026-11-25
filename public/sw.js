// Service worker do Vértice: só cuida das notificações (não faz cache, para as
// atualizações do app chegarem na hora).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data && e.data.text() } }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Vértice', {
      body: d.body || '',
      tag: d.tag,
      renotify: !!d.tag,
      icon: 'icon-192.png',
      badge: 'badge-96.png',
      data: { url: d.url || './#/noticias' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope)) {
        await c.focus()
        if ('navigate' in c) await c.navigate(url).catch(() => {})
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
