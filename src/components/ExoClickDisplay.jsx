/**
 * Display/banner ads are retired (VAST-only stack).
 * This module stays import-safe so old call sites do not crash the app.
 */
import { useEffect } from 'react'
import { AD_PROVIDER_SCRIPT } from '../lib/adZones'

export const EXOCLICK_AD_SCRIPT = AD_PROVIDER_SCRIPT
export const EXOCLICK_BANNER_ZONE = ''
export const EXOCLICK_BANNER_CLASS = ''

export const FILL_TIMEOUT_MS = 2500
export const FILL_RETRY_MS = 900
export const BANNER_FILL_TIMEOUT_MS = 6000

export { ensureExoClickScript } from '../lib/exoClickServe'

export function slotHasAd() {
  return false
}

/** No-op: banners removed. Notifies parent of empty fill. */
export default function ExoClickDisplay({ active = true, onFill, className = '' }) {
  useEffect(() => {
    if (!active) return undefined
    onFill?.(false)
    return undefined
  }, [active, onFill])

  return (
    <div
      className={`exo-slot pointer-events-none min-h-0 w-full ${className}`}
      data-ad-retired="banner"
      aria-hidden="true"
    />
  )
}

export { clipBannerAllowed } from '../lib/adEngine'
