// Acrescentado ao service worker do PWA: recebe os avisos e abre a O.S. ao tocar
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { titulo: 'Orbitalis', corpo: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(d.titulo || 'Orbitalis', {
    body: d.corpo || '',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || '/minhas-os' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/minhas-os'
  event.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of abertas) {
      if ('focus' in c) { await c.focus(); if ('navigate' in c) { try { await c.navigate(url) } catch {} } return }
    }
    await self.clients.openWindow(url)
  })())
})
