/**
 * Web Push scaffold — free VAPID-based subscriptions.
 * Needs NEXT_PUBLIC_VAPID_PUBLIC_KEY (and a server to store endpoints).
 */
import { runtimeEnv } from './runtimeEnv'
import { lsGet, lsSet } from './storage'
import { webPushEnabled } from './featureFlags'

const SUB_KEY = 'calabi_push_subscription'
const SW_PATH = '/sw-push.js'

export function vapidPublicKey() {
  return String(runtimeEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY') || runtimeEnv('VITE_VAPID_PUBLIC_KEY') || '').trim()
}

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function pushConfigured() {
  return webPushEnabled() && !!vapidPublicKey()
}

export function getSavedPushSubscription() {
  return lsGet(SUB_KEY, null)
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function enableWebPush() {
  if (!pushSupported()) return { ok: false, error: 'unsupported' }
  if (!pushConfigured()) return { ok: false, error: 'need_vapid' }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: 'denied' }

  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()),
    })
  }
  const json = sub.toJSON()
  lsSet(SUB_KEY, json)
  // Best-effort POST to optional Edge Function
  const url = String(runtimeEnv('VITE_PUSH_SUBSCRIBE_URL') || '').trim()
  if (url) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: json }),
      })
    } catch { /* local save is enough for scaffold */ }
  }
  return { ok: true, subscription: json }
}

export async function disableWebPush() {
  if (!pushSupported()) return { ok: true }
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
    const sub = await reg?.pushManager?.getSubscription()
    if (sub) await sub.unsubscribe()
  } catch { /* ignore */ }
  lsSet(SUB_KEY, null)
  return { ok: true }
}
