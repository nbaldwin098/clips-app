import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Film, Clapperboard, Image as ImageIcon, Radio, Users, Activity } from 'lucide-react'
import {
  layoutBubbleNetwork,
  contentBounds,
  fitZoomForBounds,
  clampBubbleZoom,
  clampPanToBox,
  formatCompactCount,
} from '../../lib/bubbleEngine'

const NODE_META = {
  videos: { label: 'Videos', color: '#38bdf8', Icon: Film },
  clips: { label: 'Clips', color: '#f472b6', Icon: Clapperboard },
  pics: { label: 'Pics', color: '#a78bfa', Icon: ImageIcon },
  live: { label: 'Live', color: '#eb0400', Icon: Radio },
  creators: { label: 'Creators', color: '#34d399', Icon: Users },
  interactions: { label: 'Interactions', color: '#fbbf24', Icon: Activity },
}

/**
 * Site-wide bubble for Stats → More: calabi at center, platform facets in orbit.
 * Layout always fits the box; pan/zoom clamp so nothing leaves the frame.
 */
export default function SiteBubbleMap({
  videos = 0,
  clips = 0,
  pics = 0,
  live = 0,
  creators = 0,
  interactions = 0,
}) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 720, h: 520 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(null)
  const dragRef = useRef(null)

  const nodes = useMemo(() => ([
    { id: 'videos', value: videos, weight: Math.max(1, videos), ...NODE_META.videos },
    { id: 'clips', value: clips, weight: Math.max(1, clips), ...NODE_META.clips },
    { id: 'pics', value: pics, weight: Math.max(1, pics), ...NODE_META.pics },
    { id: 'live', value: live, weight: Math.max(1, live), ...NODE_META.live },
    { id: 'creators', value: creators, weight: Math.max(1, creators), ...NODE_META.creators },
    { id: 'interactions', value: interactions, weight: Math.max(1, interactions), ...NODE_META.interactions },
  ]), [videos, clips, pics, live, creators, interactions])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(280, r.width), h: Math.max(280, r.height) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const laid = useMemo(
    () => layoutBubbleNetwork(nodes, size.w, size.h, { pad: 72 }),
    [nodes, size.w, size.h]
  )
  const bounds = useMemo(() => contentBounds(laid), [laid])
  const fitZ = useMemo(
    () => fitZoomForBounds(bounds, size.w, size.h, { pad: 8 }),
    [bounds, size.w, size.h]
  )

  const keepHubInView = useCallback((nextZoom, nextPan) => {
    return clampPanToBox(nextPan, nextZoom, size, bounds)
  }, [bounds, size])

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [size.w, size.h, nodes])

  useEffect(() => {
    setZoom((z) => clampBubbleZoom(z, fitZ, 8))
  }, [fitZ])

  useEffect(() => {
    setPan((p) => keepHubInView(zoom, p))
  }, [zoom, keepHubInView])

  const zoomAt = useCallback((factor, clientX, clientY) => {
    const el = wrapRef.current
    if (!el) {
      setZoom((z) => clampBubbleZoom(z * factor, fitZ, 8))
      return
    }
    const rect = el.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top
    setZoom((z) => {
      const next = clampBubbleZoom(z * factor, fitZ, 8)
      setPan((p) => {
        const wx = (cx - p.x) / z
        const wy = (cy - p.y) / z
        const raw = { x: cx - wx * next, y: cy - wy * next }
        return keepHubInView(next, raw)
      })
      return next
    })
  }, [keepHubInView, fitZ])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      zoomAt(e.deltaY > 0 ? 0.9 : 1 / 0.9, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    dragRef.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const raw = { x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }
    setPan(keepHubInView(zoom, raw))
  }
  const onPointerUp = () => { dragRef.current = null }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#07070a] overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-sm font-semibold text-white">Site bubble</p>
        <p className="text-xs text-zinc-500 mt-0.5">calabi at the center — videos, clips, pics, live, creators, and interactions. Fits the box; scroll to zoom.</p>
      </div>
      <div
        ref={wrapRef}
        className="relative h-[min(70vh,640px)] min-h-[480px] overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <defs>
            <radialGradient id="site-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#16161f" />
              <stop offset="100%" stopColor="#07070a" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#site-glow)" />
          {laid.nodes.map((n) => (
            <line
              key={`e_${n.id}`}
              x1={laid.hub.x}
              y1={laid.hub.y}
              x2={n.x}
              y2={n.y}
              stroke={n.color}
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
          ))}
          <g transform={`translate(${laid.hub.x}, ${laid.hub.y})`}>
            <circle r={laid.hub.size / 2 + 10} fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="2" />
            <circle r={laid.hub.size / 2} fill="#f4f4f5" />
            <text textAnchor="middle" dominantBaseline="middle" fill="#09090b" fontSize="11" fontWeight="800">
              calabi
            </text>
          </g>
          {laid.nodes.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
            >
              <circle r={n.size / 2 + 3} fill="none" stroke={n.color} strokeWidth="2.5" />
              <circle r={n.size / 2} fill="#121218" />
              <text textAnchor="middle" dominantBaseline="middle" fill={n.color} fontSize="10" fontWeight="700">
                {formatCompactCount(n.value)}
              </text>
              <text y={n.size / 2 + 14} textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="600">
                {n.label}
              </text>
            </g>
          ))}
        </svg>
        {hover ? (
          <div className="pointer-events-none absolute left-4 bottom-4 border border-zinc-700 bg-[#0e0e14]/95 px-3 py-2">
            <p className="text-xs font-semibold text-white">{hover.label}</p>
            <p className="text-[11px] text-zinc-400">{Number(hover.value).toLocaleString()} on the site</p>
          </div>
        ) : null}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              const r = wrapRef.current?.getBoundingClientRect()
              zoomAt(1.15, (r?.left || 0) + (r?.width || 0) / 2, (r?.top || 0) + (r?.height || 0) / 2)
            }}
            className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-sm font-bold"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              const r = wrapRef.current?.getBoundingClientRect()
              zoomAt(1 / 1.15, (r?.left || 0) + (r?.width || 0) / 2, (r?.top || 0) + (r?.height || 0) / 2)
            }}
            className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-sm font-bold"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
            className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-[10px] font-bold"
          >
            ⟲
          </button>
        </div>
      </div>
    </div>
  )
}
