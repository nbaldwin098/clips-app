import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  INTERACTION_TYPES,
  resolveActorIdentities,
  VIEW_ONLY_COLOR,
} from '../../lib/creatorInteractions'
import { fetchProfilesByIds } from '../../lib/profiles'
import { cn } from '../../lib/utils'

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

function layoutNetwork(people, width, height) {
  const cx = width / 2
  const cy = height / 2
  const hubR = 32
  const maxR = Math.min(width, height) * 0.42
  const placed = people.map((p, i) => {
    const t = i + 1
    const ring = 0.28 + 0.72 * Math.sqrt(t / Math.max(people.length, 1))
    const angle = i * GOLDEN
    const radius = hubR + 40 + ring * maxR
    const size = Math.min(44, Math.max(18, 14 + Math.sqrt(p.weight || 1) * 6))
    return {
      ...p,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      size,
    }
  })
  return {
    hub: { id: 'hub', x: cx, y: cy, size: hubR * 2 },
    nodes: placed,
  }
}

function formatWhen(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function personLabel(p) {
  if (p.kind === 'guests') return 'Unsigned viewers'
  if (p.handle) return `@${String(p.handle).replace(/^@/, '')}`
  if (p.displayName) return p.displayName
  if (p.actorId) return `${String(p.actorId).slice(0, 8)}…`
  return 'Viewer'
}

function typeChips(byType = {}) {
  return Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, n]) => {
      const meta = INTERACTION_TYPES.find((t) => t.id === id)
      return { id, n, label: meta?.short || id, color: meta?.color || '#a1a1aa' }
    })
}

/** Brown ring if view-only; colored rings for real actions. */
function actionRingColors(person) {
  const entries = Object.entries(person?.byType || {})
    .filter(([, n]) => Number(n) > 0)
    .sort((a, b) => b[1] - a[1])
  const actions = entries.filter(([id]) => id !== 'view')
  if (!actions.length) {
    return [{ id: 'view', color: VIEW_ONLY_COLOR || '#92400e', label: 'View only' }]
  }
  return actions.map(([id]) => {
    const meta = INTERACTION_TYPES.find((t) => t.id === id)
    return { id, color: meta?.color || person.color || '#a1a1aa', label: meta?.short || id }
  })
}

function ActionRings({ radius, rings, active }) {
  const list = rings?.length ? rings : [{ id: 'x', color: '#a1a1aa' }]
  const band = Math.max(2.2, Math.min(3.6, 10 / list.length))
  return (
    <g>
      {list.map((ring, idx) => (
        <circle
          key={ring.id}
          r={radius + 2 + idx * (band + 0.8)}
          fill="none"
          stroke={ring.color}
          strokeOpacity={active ? 1 : 0.88}
          strokeWidth={active ? band + 0.6 : band}
        />
      ))}
      {active ? (
        <circle
          r={radius + 2 + list.length * (band + 0.8) + 2}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.55}
          strokeWidth={1.2}
        />
      ) : null}
    </g>
  )
}

function ColorLegend({ counts = {} }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {INTERACTION_TYPES.map((t) => {
        const n = Number(counts[t.id]) || 0
        return (
          <div
            key={t.id}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-[#0e0e14] px-2 py-1"
            title={t.label}
          >
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/40"
              style={{ background: t.color }}
            />
            <span className="text-[11px] font-medium text-zinc-200">{t.short}</span>
            <span className="text-[10px] tabular-nums text-zinc-500">{n}</span>
          </div>
        )
      })}
    </div>
  )
}

function TimeScrubber({ startMs, endMs, valueMs, onChange, peopleCount, actionCount }) {
  if (!startMs || !endMs || endMs <= startMs) return null
  const pct = Math.max(0, Math.min(100, ((valueMs - startMs) / (endMs - startMs)) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>Posted {formatWhen(startMs)}</span>
        <span className="text-zinc-300 font-semibold tabular-nums">
          {peopleCount} people · {actionCount} actions by {formatWhen(valueMs)}
        </span>
        <span>Now</span>
      </div>
      <input
        type="range"
        min={startMs}
        max={endMs}
        step={Math.max(1000, Math.floor((endMs - startMs) / 400))}
        value={valueMs}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white h-2 cursor-pointer"
        aria-label="Scrub interactions from post time to now"
      />
      <div className="relative h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-white/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/**
 * Post-centered audience bubble map.
 * Select a post → that post is the hub; people orbit with color-coded action rings.
 */
export default function InteractionBubbleMap({
  network = null,
  nodes: legacyNodes = [],
  selectedPostId = null,
  selectedPost = null,
  onSelectPost,
  postTitle = null,
  creator = null,
  onRefresh = null,
  refreshing = false,
  untilMs = null,
  onUntilChange = null,
  postStartMs = null,
}) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 640, h: 420 })
  const [hover, setHover] = useState(null)
  const [filter, setFilter] = useState('all')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const [identities, setIdentities] = useState({})
  const nowMs = Date.now()
  const startMs = postStartMs && Number.isFinite(postStartMs) ? postStartMs : nowMs - 86400000
  const endMs = nowMs
  const scrubMs = untilMs != null && Number.isFinite(untilMs) ? untilMs : endMs

  const peopleBase = useMemo(() => {
    if (network?.people?.length) return network.people
    return (legacyNodes || [])
      .filter((n) => n.actorId && n.source !== 'tally')
      .map((n) => ({
        id: `actor_${n.actorId}`,
        kind: 'person',
        actorId: n.actorId,
        weight: n.weight || 1,
        eventCount: n.count || 1,
        byType: { [n.type]: n.weight || 1 },
        types: [n.type],
        primaryType: n.type,
        primaryLabel: n.label,
        color: n.color,
        short: n.short,
        primarySurface: n.surface,
        primaryContentType: n.contentType,
        contentIds: n.contentId ? [n.contentId] : [],
        topContentId: n.contentId,
        topTitle: n.title,
        firstAt: n.at,
        lastAt: n.at,
        events: [],
      }))
  }, [network, legacyNodes])

  const edgesBase = network?.edges || []
  const summary = network?.summary || {
    people: peopleBase.filter((p) => p.kind === 'person').length,
    total: 0,
    byType: {},
  }
  const hubMeta = network?.hub || null

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(320, r.width), h: Math.max(260, r.height) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const ids = peopleBase.map((p) => p.actorId).filter(Boolean)
    if (!ids.length) {
      setIdentities({})
      return undefined
    }
    let cancelled = false
    setIdentities(resolveActorIdentities(ids, {}))
    fetchProfilesByIds(ids).then((cloud) => {
      if (cancelled) return
      setIdentities(resolveActorIdentities(ids, cloud || {}))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [peopleBase])

  const enriched = useMemo(() => peopleBase.map((p) => {
    if (!p.actorId) return p
    const id = identities[p.actorId]
    if (!id) return p
    return {
      ...p,
      handle: id.handle || p.handle,
      displayName: id.displayName || p.displayName,
      avatarUrl: id.avatarUrl || p.avatarUrl,
    }
  }), [peopleBase, identities])

  const filtered = useMemo(() => {
    if (filter === 'all') return enriched
    return enriched.filter((n) => (n.byType && n.byType[filter]) || n.primaryType === filter)
  }, [enriched, filter])

  // Fixed layout world; zoom/pan are a camera (endless), not a re-layout.
  const laid = useMemo(() => layoutNetwork(filtered, size.w, size.h), [filtered, size.w, size.h])

  const hubId = hubMeta?.id || (selectedPostId ? `hub_post_${selectedPostId}` : `hub_${creator?.id || 'creator'}`)
  const nodeById = useMemo(() => {
    const m = new Map()
    m.set(hubId, { ...laid.hub, id: hubId })
    m.set('hub', { ...laid.hub, id: hubId })
    for (const n of laid.nodes) m.set(n.id, n)
    return m
  }, [laid, hubId])

  const hubPos = nodeById.get(hubId) || laid.hub

  const visibleEdges = useMemo(() => {
    const ids = new Set(laid.nodes.map((n) => n.id))
    return (edgesBase || []).filter((e) => {
      const fromOk = e.from === hubId || e.from === 'hub' || ids.has(e.from)
      const toOk = ids.has(e.to)
      return fromOk && toOk
    })
  }, [edgesBase, laid.nodes, hubId])

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return
    dragRef.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [pan])

  const onPointerMove = useCallback((e) => {
    const d = dragRef.current
    if (!d) return
    setPan({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) })
  }, [])

  const onPointerUp = useCallback(() => { dragRef.current = null }, [])

  const clampZoom = (z) => {
    // Soft safety only — effectively endless for normal use
    if (!Number.isFinite(z) || z <= 0) return 1
    return Math.min(500, Math.max(0.02, z))
  }

  const zoomAt = useCallback((factor, clientX, clientY) => {
    const el = wrapRef.current
    if (!el) {
      setZoom((z) => clampZoom(z * factor))
      return
    }
    const rect = el.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top
    setZoom((z) => {
      const next = clampZoom(z * factor)
      setPan((p) => {
        const wx = (cx - p.x) / z
        const wy = (cy - p.y) / z
        return { x: cx - wx * next, y: cy - wy * next }
      })
      return next
    })
  }, [])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1 / 0.9
    zoomAt(factor, e.clientX, e.clientY)
  }, [zoomAt])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const title = postTitle || selectedPost?.title || hubMeta?.label || 'Post'
  const viewCount = Number(summary.byType?.view) || 0
  const isPostHub = hubMeta?.kind === 'post' || !!selectedPostId

  if (!selectedPostId) {
    return (
      <div className="h-full min-h-0 flex flex-col items-center justify-center bg-[#07070a] border border-zinc-800 p-8 text-center">
        <p className="text-sm font-semibold text-white">Pick a post</p>
        <p className="text-xs text-zinc-500 mt-2 max-w-sm">
          Each post has its own bubble map. Select one from Your posts — that post becomes the center, and everyone who viewed or acted on it orbits around it.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#07070a] border border-zinc-800">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">
            Post bubble · {title}
          </p>
          <p className="text-[11px] text-zinc-500">
            Post is the center. People around it are color-coded by what they did.
            {summary.people ? ` · ${summary.people} people` : ''}
            {summary.total ? ` · ${summary.total} actions` : ''}
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            disabled={refreshing}
            onClick={() => onRefresh()}
            className="h-7 px-2.5 text-[11px] font-semibold border border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-50"
          >
            {refreshing ? 'Syncing…' : 'Sync cloud'}
          </button>
        ) : null}
      </div>

      <div className="shrink-0 px-3 py-2 border-b border-zinc-800 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Legend</p>
        <ColorLegend counts={summary.byType || {}} />
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'h-7 px-2.5 text-[11px] font-medium border',
              filter === 'all' ? 'border-white text-white' : 'border-zinc-800 text-zinc-500 hover:text-white'
            )}
          >
            All
          </button>
          {INTERACTION_TYPES.filter((t) => t.id !== 'subscribe').map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={cn(
                'h-7 px-2 text-[11px] font-medium border inline-flex items-center gap-1.5',
                filter === t.id ? 'border-white text-white' : 'border-zinc-800 text-zinc-500 hover:text-white'
              )}
            >
              <span className="h-3 w-3 rounded-sm" style={{ background: t.color }} />
              {t.short}
            </button>
          ))}
        </div>
      </div>

      {onUntilChange ? (
        <div className="shrink-0 px-3 py-2.5 border-b border-zinc-800">
          <TimeScrubber
            startMs={startMs}
            endMs={endMs}
            valueMs={scrubMs}
            onChange={onUntilChange}
            peopleCount={summary.people || 0}
            actionCount={summary.total || 0}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 flex flex-col">
        <div
          ref={wrapRef}
          className="relative flex-1 min-h-[260px] overflow-hidden cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {!laid.nodes.length ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm text-zinc-300">No interactions yet for this post</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  When someone views or likes while cloud signed-in, they appear here. Scrub the slider to replay growth from publish → now.
                </p>
              </div>
            </div>
          ) : (
            <svg
              width={size.w}
              height={size.h}
              viewBox={`0 0 ${size.w} ${size.h}`}
              className="absolute left-0 top-0 origin-top-left will-change-transform"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              role="img"
              aria-label="Post audience bubble map"
            >
              <defs>
                <radialGradient id="net-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1a1a24" />
                  <stop offset="100%" stopColor="#07070a" />
                </radialGradient>
                <pattern id="studio-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#14141c" strokeWidth="1" />
                </pattern>
                {laid.nodes.map((n) => (
                  n.avatarUrl ? (
                    <clipPath key={`clip_${n.id}`} id={`clip_${n.id}`}>
                      <circle r={n.size / 2} />
                    </clipPath>
                  ) : null
                ))}
              </defs>
              <rect width="100%" height="100%" fill="url(#net-glow)" />
              <rect width="100%" height="100%" fill="url(#studio-grid)" />

              {visibleEdges.map((e) => {
                const from = e.from === hubId || e.kind === 'hub' ? hubPos : nodeById.get(e.from)
                const to = nodeById.get(e.to)
                if (!from || !to) return null
                const isHub = e.kind === 'hub'
                return (
                  <line
                    key={e.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#ffffff"
                    strokeOpacity={isHub ? 0.28 + Math.min(0.45, (e.weight || 1) * 0.04) : 0.12}
                    strokeWidth={isHub ? Math.min(2.8, 0.8 + Math.log2((e.weight || 1) + 1) * 0.45) : 0.7}
                  />
                )
              })}

              {/* Post hub + recurring view pulse rings */}
              <g transform={`translate(${hubPos.x}, ${hubPos.y})`}>
                {isPostHub ? (
                  <>
                    <circle r={(hubPos.size || 64) / 2 + 18} fill="none" stroke={VIEW_ONLY_COLOR} strokeOpacity="0.35" strokeWidth="1.5">
                      <animate attributeName="r" values={`${(hubPos.size || 64) / 2 + 10};${(hubPos.size || 64) / 2 + 28};${(hubPos.size || 64) / 2 + 10}`} dur="2.8s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.45;0.08;0.45" dur="2.8s" repeatCount="indefinite" />
                    </circle>
                    <circle r={(hubPos.size || 64) / 2 + 10} fill="none" stroke={VIEW_ONLY_COLOR} strokeOpacity="0.55" strokeWidth="2">
                      <animate attributeName="r" values={`${(hubPos.size || 64) / 2 + 6};${(hubPos.size || 64) / 2 + 16};${(hubPos.size || 64) / 2 + 6}`} dur="2.8s" begin="0.6s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.6;0.12;0.6" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
                    </circle>
                  </>
                ) : (
                  <circle r={(hubPos.size || 56) / 2 + 6} fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1.5" />
                )}
                <circle r={(hubPos.size || 64) / 2} fill="#f4f4f5" />
                {hubMeta?.thumbUrl || selectedPost?.thumbUrl ? (
                  <image
                    href={hubMeta?.thumbUrl || selectedPost?.thumbUrl}
                    x={-(hubPos.size || 64) / 2}
                    y={-(hubPos.size || 64) / 2}
                    width={hubPos.size || 64}
                    height={hubPos.size || 64}
                    clipPath="circle(50%)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <text textAnchor="middle" dominantBaseline="middle" fill="#09090b" fontSize="10" fontWeight="800">
                    POST
                  </text>
                )}
                <text y={(hubPos.size || 64) / 2 + 14} textAnchor="middle" fill="#e4e4e7" fontSize="9" fontWeight="600">
                  {(title || 'Post').length > 22 ? `${String(title).slice(0, 21)}…` : (title || 'Post')}
                </text>
                {viewCount ? (
                  <text y={(hubPos.size || 64) / 2 + 26} textAnchor="middle" fill="#a16207" fontSize="8">
                    {viewCount} view{viewCount === 1 ? '' : 's'}
                  </text>
                ) : null}
              </g>

              {laid.nodes.map((b) => {
                const label = personLabel(b)
                const active = hover?.id === b.id
                const rings = actionRingColors(b)
                const ringPad = 2 + rings.length * 4.2
                return (
                  <g
                    key={b.id}
                    transform={`translate(${b.x}, ${b.y})`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHover(b)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <ActionRings radius={b.size / 2} rings={rings} active={active} />
                    <circle r={b.size / 2} fill="#121218" />
                    {b.avatarUrl ? (
                      <image
                        href={b.avatarUrl}
                        x={-b.size / 2}
                        y={-b.size / 2}
                        width={b.size}
                        height={b.size}
                        clipPath={`url(#clip_${b.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    ) : (
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#e4e4e7"
                        fontSize={Math.min(12, b.size / 2.4)}
                        fontWeight="700"
                      >
                        {(label.replace(/^@/, '')[0] || '?').toUpperCase()}
                      </text>
                    )}
                    {b.size > 26 ? (
                      <text y={b.size / 2 + ringPad + 8} textAnchor="middle" fill="#d4d4d8" fontSize="8">
                        {label.length > 14 ? `${label.slice(0, 13)}…` : label}
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </svg>
          )}

          {hover ? (
            <div
              className="pointer-events-none absolute z-20 max-w-xs border border-zinc-600 bg-[#0e0e14]/95 backdrop-blur-sm px-3 py-2 shadow-xl"
              style={{
                left: Math.min(size.w - 240, Math.max(8, (hover.x * zoom) + pan.x - 60)),
                top: Math.max(8, (hover.y * zoom) + pan.y - 88),
              }}
            >
              <p className="text-xs font-semibold text-white">{personLabel(hover)}</p>
              <p className="text-[11px] text-zinc-300 mt-0.5">{hover.primaryLabel}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {typeChips(hover.byType).map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border border-zinc-700 text-zinc-300"
                  >
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                    {c.label} {c.n}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                {hover.eventCount} events · last {formatWhen(hover.lastAt)}
              </p>
            </div>
          ) : null}

          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                const el = wrapRef.current?.getBoundingClientRect()
                const cx = (el?.left || 0) + (el?.width || 0) / 2
                const cy = (el?.top || 0) + (el?.height || 0) / 2
                zoomAt(1.2, cx, cy)
              }}
              className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-sm font-bold"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                const el = wrapRef.current?.getBoundingClientRect()
                const cx = (el?.left || 0) + (el?.width || 0) / 2
                const cy = (el?.top || 0) + (el?.height || 0) / 2
                zoomAt(1 / 1.2, cx, cy)
              }}
              className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-sm font-bold"
              aria-label="Zoom out"
            >
              −
            </button>
            <button type="button" onClick={resetView} className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-[10px] font-bold" aria-label="Reset view">⟲</button>
            <span className="text-[9px] text-zinc-500 text-center tabular-nums">{zoom >= 10 ? zoom.toFixed(0) : zoom.toFixed(2)}×</span>
          </div>
        </div>
      </div>
    </div>
  )
}
