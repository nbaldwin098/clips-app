import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  Film,
  Clapperboard,
  Image as ImageIcon,
  Radio,
  ThumbsUp,
  ThumbsDown,
  X,
  ChevronLeft,
} from 'lucide-react'
import {
  prepareBubblePopulation,
  layoutBubbleNetwork,
  contentBounds,
  fitZoomForBounds,
  clampBubbleZoom,
  clampPanToBox,
  formatCompactCount,
} from '../../lib/bubbleEngine'

const FACET_META = {
  videos: {
    label: 'Videos',
    color: '#38bdf8',
    Icon: Film,
    blurb: 'Every long-form video in the catalog.',
  },
  clips: {
    label: 'Clips',
    color: '#f472b6',
    Icon: Clapperboard,
    blurb: 'Every vertical clip in the catalog.',
  },
  pics: {
    label: 'Pics',
    color: '#a78bfa',
    Icon: ImageIcon,
    blurb: 'Every photo post in the catalog.',
  },
  lives: {
    label: 'Lives',
    color: '#eb0400',
    Icon: Radio,
    blurb: 'Creators broadcasting right now.',
  },
  likes: {
    label: 'Likes',
    color: '#34d399',
    Icon: ThumbsUp,
    blurb: 'Posts with positive votes.',
  },
  dislikes: {
    label: 'Dislikes',
    color: '#f87171',
    Icon: ThumbsDown,
    blurb: 'Posts with negative votes.',
  },
}

function shortTitle(title, fallback = 'Untitled') {
  const t = String(title || fallback).trim() || fallback
  return t.length > 18 ? `${t.slice(0, 17)}…` : t
}

/**
 * Build child bubbles for a facet — one node per real catalog item (LOD-capped).
 */
function buildChildPeople(facetId, buckets) {
  const meta = FACET_META[facetId] || FACET_META.videos
  const rows = buckets?.[facetId] || []
  const people = rows.map((row, i) => {
    const weight = Math.max(1, Number(row.weight) || 1)
    return {
      id: row.id || `${facetId}_${i}`,
      kind: 'item',
      facetId,
      contentId: row.contentId || row.id,
      contentType: row.contentType || null,
      displayName: shortTitle(row.title || row.label || row.handle || meta.label),
      handle: row.handle || '',
      weight,
      eventCount: weight,
      byType: { [facetId]: weight },
      primaryType: facetId,
      primaryLabel: meta.label,
      color: meta.color,
      short: meta.label.slice(0, 1),
      thumbUrl: row.thumbUrl || null,
      raw: row,
    }
  })
  return prepareBubblePopulation(people, {
    cap: 220,
    totalHint: Math.max(people.length, Number(buckets?.counts?.[facetId]) || 0),
  })
}

/**
 * Site-wide bubble for Stats → More.
 * Overview: facet hubs. Click a facet → expand into all item bubbles for that section.
 */
export default function SiteBubbleMap({
  videos = 0,
  clips = 0,
  pics = 0,
  lives = 0,
  likes = 0,
  dislikes = 0,
  buckets = null,
  onNavigate = null,
}) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 720, h: 480 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const dragRef = useRef(null)
  const movedRef = useRef(false)

  const overviewNodes = useMemo(() => ([
    { id: 'videos', value: videos, weight: Math.max(1, videos), kind: 'facet', ...FACET_META.videos },
    { id: 'clips', value: clips, weight: Math.max(1, clips), kind: 'facet', ...FACET_META.clips },
    { id: 'pics', value: pics, weight: Math.max(1, pics), kind: 'facet', ...FACET_META.pics },
    { id: 'lives', value: lives, weight: Math.max(1, lives), kind: 'facet', ...FACET_META.lives },
    { id: 'likes', value: likes, weight: Math.max(1, likes), kind: 'facet', ...FACET_META.likes },
    { id: 'dislikes', value: dislikes, weight: Math.max(1, dislikes), kind: 'facet', ...FACET_META.dislikes },
  ]), [videos, clips, pics, lives, likes, dislikes])

  const childPop = useMemo(() => {
    if (!expandedId) return null
    return buildChildPeople(expandedId, buckets)
  }, [expandedId, buckets])

  const activePeople = useMemo(() => {
    if (expandedId && childPop) return childPop.nodes
    return overviewNodes.map((n) => ({
      ...n,
      displayName: n.label,
      kind: 'facet',
    }))
  }, [expandedId, childPop, overviewNodes])

  const hubLabel = expandedId
    ? (FACET_META[expandedId]?.label || 'Section')
    : 'calabi'

  const hubColor = expandedId
    ? (FACET_META[expandedId]?.color || '#f4f4f5')
    : '#f4f4f5'

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const laid = useMemo(
    () => layoutBubbleNetwork(activePeople, size.w, size.h, { pad: 72 }),
    [activePeople, size.w, size.h]
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
    setSelectedItem(null)
  }, [size.w, size.h, expandedId, activePeople.length])

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
    movedRef.current = false
    dragRef.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    if (Math.abs(e.clientX - d.px) + Math.abs(e.clientY - d.py) > 4) movedRef.current = true
    const raw = { x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }
    setPan(keepHubInView(zoom, raw))
  }
  const onPointerUp = () => { dragRef.current = null }

  const openFacet = (id) => {
    if (movedRef.current) return
    setExpandedId(id)
    setSelectedItem(null)
  }

  const onNodeClick = (n) => {
    if (movedRef.current) return
    if (!expandedId) {
      openFacet(n.id)
      return
    }
    if (n.isCluster || n.kind === 'cluster') {
      setSelectedItem(n)
      return
    }
    setSelectedItem(n)
  }

  const openSelected = () => {
    if (!selectedItem?.contentId) return
    const type = selectedItem.contentType
    if (type === 'pic') onNavigate?.('pics', selectedItem.contentId)
    else if (type === 'short') onNavigate?.('clips', selectedItem.contentId)
    else if (type === 'live') onNavigate?.('live')
    else onNavigate?.('watch', selectedItem.contentId)
  }

  const facetMeta = expandedId ? FACET_META[expandedId] : null
  const childCount = childPop?.total ?? 0

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#07070a] overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {expandedId ? `${facetMeta?.label || 'Section'} bubbles` : 'Site bubble'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {expandedId
              ? `${formatCompactCount(childCount)} in this section${childPop?.aggregated ? ` · showing ${childPop.shown} + cluster` : ''} · click a bubble`
              : 'Click Videos, Clips, Pics, Lives, Likes, or Dislikes to expand into every bubble'}
          </p>
        </div>
        {expandedId ? (
          <button
            type="button"
            onClick={() => { setExpandedId(null); setSelectedItem(null) }}
            className="h-8 px-3 inline-flex items-center gap-1.5 border border-zinc-700 text-xs text-zinc-200 hover:border-white hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> All sections
          </button>
        ) : null}
      </div>

      <div
        ref={wrapRef}
        className="relative h-[min(55vh,520px)] min-h-[320px] overflow-hidden cursor-grab active:cursor-grabbing touch-none"
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
            {laid.nodes.map((n) => (
              n.thumbUrl ? (
                <clipPath key={`clip_${n.id}`} id={`site_clip_${n.id}`}>
                  <circle r={n.size / 2} />
                </clipPath>
              ) : null
            ))}
          </defs>
          <rect width="100%" height="100%" fill="url(#site-glow)" />
          {laid.nodes.map((n) => (
            <line
              key={`e_${n.id}`}
              x1={laid.hub.x}
              y1={laid.hub.y}
              x2={n.x}
              y2={n.y}
              stroke={n.color || hubColor}
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
          ))}
          <g transform={`translate(${laid.hub.x}, ${laid.hub.y})`}>
            <circle r={laid.hub.size / 2 + 10} fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="2" />
            <circle r={laid.hub.size / 2} fill={expandedId ? '#121218' : '#f4f4f5'} stroke={hubColor} strokeWidth={expandedId ? 2 : 0} />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fill={expandedId ? hubColor : '#09090b'}
              fontSize={expandedId ? 10 : 11}
              fontWeight="800"
            >
              {hubLabel}
            </text>
          </g>
          {laid.nodes.map((n) => {
            const isCluster = n.isCluster || n.kind === 'cluster'
            const isFacet = n.kind === 'facet' || (!expandedId && FACET_META[n.id])
            const isSel = selectedItem?.id === n.id
            const label = n.displayName || n.label || '?'
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  onNodeClick(n)
                }}
              >
                <circle
                  r={n.size / 2 + 3}
                  fill="none"
                  stroke={isSel ? '#ffffff' : (n.color || '#a1a1aa')}
                  strokeWidth={isSel ? 3 : 2.5}
                  strokeDasharray={isCluster ? '4 3' : undefined}
                />
                <circle r={n.size / 2} fill="#121218" />
                {n.thumbUrl && !isCluster ? (
                  <image
                    href={n.thumbUrl}
                    x={-n.size / 2}
                    y={-n.size / 2}
                    width={n.size}
                    height={n.size}
                    clipPath={`url(#site_clip_${n.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={n.color || '#e4e4e7'}
                    fontSize={isFacet ? 10 : 9}
                    fontWeight="700"
                  >
                    {isCluster
                      ? formatCompactCount(n.clusterSize || n.weight || 0)
                      : isFacet
                        ? formatCompactCount(n.value ?? n.weight)
                        : (label.replace(/^@/, '')[0] || '?').toUpperCase()}
                  </text>
                )}
                <text y={n.size / 2 + 14} textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="600">
                  {isFacet ? (n.label || label) : (label.length > 14 ? `${label.slice(0, 13)}…` : label)}
                </text>
              </g>
            )
          })}
        </svg>

        {hover && !selectedItem ? (
          <div className="pointer-events-none absolute left-4 bottom-4 border border-zinc-700 bg-[#0e0e14]/95 px-3 py-2 max-w-xs">
            <p className="text-xs font-semibold text-white truncate">
              {hover.displayName || hover.label}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {!expandedId
                ? `${Number(hover.value || 0).toLocaleString()} · click to expand`
                : hover.isCluster || hover.kind === 'cluster'
                  ? `${formatCompactCount(hover.clusterSize || hover.weight)} more · aggregated`
                  : `${Number(hover.weight || 1).toLocaleString()} · click for details`}
            </p>
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

      {selectedItem && expandedId ? (
        <div className="border-t border-zinc-800 px-4 py-4 bg-[#0c0c12]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                {facetMeta?.label}
                {selectedItem.isCluster || selectedItem.kind === 'cluster' ? ' · cluster' : ''}
              </p>
              <p className="text-sm font-semibold text-white truncate mt-1">
                {selectedItem.displayName || selectedItem.label}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {selectedItem.isCluster || selectedItem.kind === 'cluster'
                  ? `${formatCompactCount(selectedItem.clusterSize || selectedItem.weight)} more items rolled up for performance`
                  : selectedItem.handle
                    ? `@${String(selectedItem.handle).replace(/^@/, '')}`
                    : 'Catalog item'}
              </p>
              {selectedItem.contentId && !(selectedItem.isCluster || selectedItem.kind === 'cluster') ? (
                <button
                  type="button"
                  onClick={openSelected}
                  className="mt-3 h-8 px-3 border border-white text-xs font-semibold text-white hover:bg-white hover:text-black"
                >
                  Open
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="h-8 w-8 shrink-0 inline-flex items-center justify-center border border-zinc-700 text-zinc-400 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {!expandedId ? (
        <div className="border-t border-zinc-800 px-4 py-3 bg-[#0c0c12]">
          <p className="text-[11px] text-zinc-500">
            Tip: click any section bubble (even at 0) to expand it into individual bubbles.
          </p>
        </div>
      ) : null}
    </div>
  )
}
