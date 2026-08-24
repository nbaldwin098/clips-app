import { useEffect, useId } from 'react'

export const EXOCLICK_AD_SCRIPT = 'https://a.magsrv.com/ad-provider.js'
export const EXOCLICK_DISPLAY_ZONE = '6010926'
export const EXOCLICK_INS_CLASS = 'eas6a97888e37'

export function ensureExoClickScript() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[src="${EXOCLICK_AD_SCRIPT}"]`)) return
  const s = document.createElement('script')
  s.async = true
  s.type = 'application/javascript'
  s.src = EXOCLICK_AD_SCRIPT
  document.head.appendChild(s)
}

export default function ExoClickDisplay({ zoneId = EXOCLICK_DISPLAY_ZONE, className = '' }) {
  const rid = useId().replace(/:/g, '')

  useEffect(() => {
    ensureExoClickScript()
    const w = window
    w.AdProvider = w.AdProvider || []
    w.AdProvider.push({ serve: {} })
  }, [rid, zoneId])

  return (
    <div className={`relative h-full w-full bg-[#111] overflow-hidden ${className}`}>
      <span className="absolute top-1.5 left-1.5 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-black/70 text-white">Ad</span>
      <ins className={EXOCLICK_INS_CLASS} data-zoneid={String(zoneId)} data-instance={rid} />
    </div>
  )
}
