import { AD_PROVIDER_SCRIPT } from './adZones.js'

let scriptPromise = null
let serveTimer = 0

/** Load ExoClick ad-provider.js once. Resolves false if blocked or offline. */
export function ensureExoClickScript() {
  if (typeof document === 'undefined') return Promise.resolve(false)
  if (scriptPromise) return scriptPromise
  const existing = document.querySelector(`script[src="${AD_PROVIDER_SCRIPT}"]`)
  if (existing) {
    scriptPromise = Promise.resolve(true)
    return scriptPromise
  }
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script')
    s.async = true
    s.type = 'application/javascript'
    s.src = AD_PROVIDER_SCRIPT
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
  return scriptPromise
}

/**
 * Ask ExoClick to fill every <ins data-zoneid> on the page that is not yet
 * marked data-exo-queued. Debounced so a reel mounting several slots still
 * gets one serve pass after the DOM settles.
 */
export function queueExoClickServe() {
  if (typeof document === 'undefined') return Promise.resolve(false)
  if (serveTimer) window.clearTimeout(serveTimer)
  return new Promise((resolve) => {
    serveTimer = window.setTimeout(() => {
      serveTimer = 0
      const pending = [...document.querySelectorAll('ins[data-zoneid]:not([data-exo-queued])')]
      if (!pending.length) {
        resolve(false)
        return
      }
      pending.forEach((ins) => { ins.dataset.exoQueued = '1' })
      ensureExoClickScript().then((ok) => {
        if (!ok) {
          pending.forEach((ins) => { delete ins.dataset.exoQueued })
          resolve(false)
          return
        }
        const w = window
        w.AdProvider = w.AdProvider || []
        try {
          w.AdProvider.push({ serve: {} })
          resolve(true)
        } catch {
          pending.forEach((ins) => { delete ins.dataset.exoQueued })
          resolve(false)
        }
      })
    }, 48)
  })
}

/** Re-queue and serve <ins> tags inside one container (e.g. when a reel ad slide becomes active). */
export function resurfaceExoClickInContainer(container) {
  if (typeof document === 'undefined') return Promise.resolve(false)
  if (container) {
    container.querySelectorAll('ins[data-zoneid]').forEach((ins) => {
      delete ins.dataset.exoQueued
    })
  }
  return queueExoClickServe()
}
