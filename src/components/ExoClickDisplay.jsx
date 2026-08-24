import { useEffect, useId } from 'react'

export const EXOCLICK_AD_SCRIPT = 'https://a.magsrv.com/ad-provider.js'
export const EXOCLICK_DISPLAY_ZONE = '6010926'
export const EXOCLICK_INS_CLASS = 'eas6a97888e37'
export const EXOCLICK_BANNER_ZONE = '6010930'
export const EXOCLICK_BANNER_CLASS = 'eas6a97888e2'

export function ensureExoClickScript() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[src="${EXOCLICK_AD_SCRIPT}"]`)) return
  const s = document.createElement('script')
  s.async = true
  s.type = 'application/javascript'
  s.src = EXOCLICK_AD_SCRIPT
  document.head.appendChild(s)
}

export function exoClickInsClass(zoneId, format = 'display') {
  if (format === 'banner') return EXOCLICK_BANNER_CLASS
  if (format === 'display') return EXOCLICK_INS_CLASS
  if (String(zoneId) === EXOCLICK_BANNER_ZONE) return EXOCLICK_BANNER_CLASS
  return EXOCLICK_INS_CLASS
}

export function exoClickZoneForFormat(format) {
  return format === 'banner' ? EXOCLICK_BANNER_ZONE : EXOCLICK_DISPLAY_ZONE
}

/**
 * Render an ExoClick unit at its native zone size.
 * Never stretch the <ins>/iframe into 9:16 or 16:9 frames — the parent
 * letterboxes around this slot.
 */
export default function ExoClickDisplay({
  zoneId,
  insClass,
  className = '',
  active = true,
  format = 'display',
}) {
  const rid = useId().replace(/:/g, '')
  const banner = format === 'banner'
  const resolvedZone = banner ? EXOCLICK_BANNER_ZONE : (zoneId || EXOCLICK_DISPLAY_ZONE)
  const resolvedClass = insClass || (banner ? EXOCLICK_BANNER_CLASS : EXOCLICK_INS_CLASS)

  useEffect(() => {
    if (!active) return undefined
    ensureExoClickScript()
    const w = window
    w.AdProvider = w.AdProvider || []
    w.AdProvider.push({ serve: {} })
    return undefined
  }, [rid, resolvedZone, active])

  return (
    <div
      className={`exo-slot relative w-full overflow-hidden bg-[#111] flex items-center justify-center ${
        banner ? 'min-h-[90px]' : 'min-h-[250px]'
      } ${className}`}
    >
      <span className="absolute top-1.5 left-1.5 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-black/70 text-white pointer-events-none">
        Ad
      </span>
      <ins
        className={resolvedClass}
        data-zoneid={String(resolvedZone)}
        data-instance={rid}
        style={{ display: 'inline-block', maxWidth: '100%' }}
      />
    </div>
  )
}

export { clipBannerAllowed } from '../lib/adEngine'
