/* calabi Web Push service worker — free VAPID scaffold */
self.addEventListener('push', (event) => {
  let data = { title: 'calabi', body: 'New notification', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    try {
      data.body = event.data?.text() || data.body
    } catch { /* ignore */ }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'calabi', {
      body: data.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate?.(url)
          return c.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
      return undefined
    })
  )
})
