import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  INTERACTION_TYPES,
  SURFACE_LABELS,
  CONTENT_TYPE_LABELS,
  resolveActorIdentities,
} from '../../lib/creatorInteractions'
import { fetchProfilesByIds } from '../../lib/profiles'
import { cn } from '../../lib/utils'

const RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'all', label: 'All' },
]

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

function layoutNetwork(people, width, height) {
  const cx = width / 2
  const cy = height / 2
  const hubR = 28
  const maxR = Math.min(width, height) * 0.42
  const placed = people.map((p, i) => {
    const t = i + 1
    const ring = 0.28 + 0.72 * Math.sqrt(t / Math.max(people.length, 1))
    const angle = i * GOLDEN
    const radius = hubR + 36 + ring * maxR
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

/** Ordered action colors for a person — used as concentric rings (like + follow + share = 3 rings). */
function actionRingColors(person) {
  const entries = Object.entries(person?.byType || {})
    .filter(([, n]) => Number(n) > 0)
    .sort((a, b) => b[1] - a[1])
  if (entries.length) {
    return entries.map(([id]) => {
      const meta = INTERACTION_TYPES.find((t) => t.id === id)
      return { id, color: meta?.color || person.color || '#a1a1aa', label: meta?.short || id }
    })
  }
  if (person?.primaryType) {
    const meta = INTERACTION_TYPES.find((t) => t.id === person.primaryType)
    return [{ id: person.primaryType, color: meta?.color || person.color || '#a1a1aa', label: meta?.short || person.primaryType }]
  }
  return [{ id: 'view', color: person?.color || '#60a5fa', label: 'View' }]
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

export default function InteractionBubbleMap({
  network = null,
  nodes: legacyNodes = [],
  range = '7d',
  onRangeChange,
  selectedPostId = null,
  onSelectPost,
  postTitle = null,
  creator = null,
}) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 640, h: 420 })
  const [hover, setHover] = useState(null)
  const [filter, setFilter] = useState('all')
  const [surfaceFilter, setSurfaceFilter] = useState('all')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const [identities, setIdentities] = useState({})

  const peopleBase = useMemo(() => {
    if (network?.people?.length) return network.people
    // Legacy flat bubbles → treat as pseudo-people only if they carry actorId
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
  const summary = network?.summary || { people: peopleBase.filter((p) => p.kind === 'person').length, total: 0, byType: {}, bySurface: {} }

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(320, r.width), h: Math.max(280, r.height) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Resolve real handles/avatars for every actor on the map.
  useEffect(() => {
    const ids = peopleBase.map((p) => p.actorId).filter(Boolean)
    if (!ids.length) {
      setIdentities({})
      return undefined
    }
    let cancelled = false
    const local = resolveActorIdentities(ids, {})
    setIdentities(local)
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
    let list = enriched
    if (filter !== 'all') list = list.filter((n) => (n.byType && n.byType[filter]) || n.primaryType === filter)
    if (surfaceFilter !== 'all') {
      list = list.filter((n) => (n.primarySurface || 'unknown') === surfaceFilter
        || (n.events || []).some((e) => e.surface === surfaceFilter))
    }
    return list
  }, [enriched, filter, surfaceFilter])

  const worldW = size.w / zoom
  const worldH = size.h / zoom
  const laid = useMemo(() => layoutNetwork(filtered, worldW, worldH), [filtered, worldW, worldH])

  const nodeById = useMemo(() => {
    const m = new Map()
    m.set(network?.hub?.id || `hub_${creator?.id || 'creator'}`, {
      ...laid.hub,
      id: network?.hub?.id || `hub_${creator?.id || 'creator'}`,
    })
    // Also accept generic 'hub' from layout
    m.set('hub', { ...laid.hub, id: network?.hub?.id || 'hub' })
    for (const n of laid.nodes) m.set(n.id, n)
    return m
  }, [laid, network, creator?.id])

  const visibleEdges = useMemo(() => {
    const ids = new Set(laid.nodes.map((n) => n.id))
    const hubId = network?.hub?.id || `hub_${creator?.id || 'creator'}`
    return (edgesBase || []).filter((e) => {
      const fromOk = e.from === hubId || e.from === 'hub' || ids.has(e.from)
      const toOk = ids.has(e.to)
      return fromOk && toOk
    })
  }, [edgesBase, laid.nodes, network, creator?.id])

  const surfacesPresent = useMemo(() => {
    const set = new Set()
    for (const n of enriched) if (n.primarySurface) set.add(n.primarySurface)
    return [...set]
  }, [enriched])

  const topPeople = useMemo(
    () => [...filtered].filter((p) => p.kind === 'person').slice(0, 5),
    [filtered]
  )

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: pan.x,
      oy: pan.y,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [pan])

  const onPointerMove = useCallback((e) => {
    const d = dragRef.current
    if (!d) return
    setPan({
      x: d.ox + (e.clientX - d.px),
      y: d.oy + (e.clientY - d.py),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom((z) => Math.min(2.4, Math.max(0.55, z + delta)))
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const hubId = network?.hub?.id || `hub_${creator?.id || 'creator'}`
  const hubPos = nodeById.get(hubId) || nodeById.get('hub') || laid.hub

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#07070a] border border-zinc-800">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">
            Audience network{postTitle ? ` · ${postTitle}` : ''}
          </p>
          <p className="text-[11px] text-zinc-500">
            Every signed-in viewer appears — including you on your own posts. Multi-color rings = like, follow, share, and more.
            {summary.people ? ` · ${summary.people} people` : ''}
            {summary.total ? ` · ${summary.total} actions` : ''}
          </p>
        </div>
        <div className="flex items-center gap-0.5 border border-zinc-800 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRangeChange?.(r.id)}
              className={cn(
                'h-7 px-2.5 text-[11px] font-semibold',
                range === r.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-b border-zinc-800/80">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'h-7 px-2.5 text-[11px] font-medium border',
            filter === 'all' ? 'border-white text-white' : 'border-zinc-800 text-zinc-500 hover:text-white'
          )}
        >
          All actions
        </button>
        {INTERACTION_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={cn(
              'h-7 px-2.5 text-[11px] font-medium border inline-flex items-center gap-1.5',
              filter === t.id ? 'border-white text-white' : 'border-zinc-800 text-zinc-500 hover:text-white'
            )}
          >
            <span className="h-2 w-2 shrink-0" style={{ background: t.color }} />
            {t.short}
          </button>
        ))}
      </div>

      {surfacesPresent.length > 1 || selectedPostId ? (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-b border-zinc-800/80">
          {surfacesPresent.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setSurfaceFilter('all')}
                className={cn(
                  'h-7 px-2.5 text-[11px] font-medium border',
                  surfaceFilter === 'all' ? 'border-white text-white' : 'border-zinc-800 text-zinc-500'
                )}
              >
                All surfaces
              </button>
              {surfacesPresent.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSurfaceFilter(s)}
                  className={cn(
                    'h-7 px-2.5 text-[11px] font-medium border',
                    surfaceFilter === s ? 'border-white text-white' : 'border-zinc-800 text-zinc-500'
                  )}
                >
                  {SURFACE_LABELS[s] || s}
                </button>
              ))}
            </>
          ) : null}
          {selectedPostId ? (
            <button
              type="button"
              onClick={() => onSelectPost?.(null)}
              className="h-7 px-2.5 text-[11px] font-medium border border-zinc-700 text-zinc-300 ml-auto"
            >
              Clear post filter
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 flex flex-col md:flex-row">
        <div
          ref={wrapRef}
          className="relative flex-1 min-h-[280px] overflow-hidden cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {!laid.nodes.length ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm text-zinc-300">No viewers synced yet</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Open one of your posts while signed in — you should appear as a viewer node. Likes, follows, and shares add colored rings. Drag to pan, scroll to zoom.
                </p>
              </div>
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${worldW} ${worldH}`}
              className="absolute inset-0"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
              role="img"
              aria-label="Creator audience network map"
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

              {/* White connection lines */}
              {visibleEdges.map((e) => {
                const from = e.from === hubId || e.kind === 'hub'
                  ? hubPos
                  : nodeById.get(e.from)
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

              {/* Creator hub */}
              <g transform={`translate(${hubPos.x}, ${hubPos.y})`}>
                <circle r={(hubPos.size || 56) / 2 + 6} fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1.5" />
                <circle r={(hubPos.size || 56) / 2} fill="#f4f4f5" />
                {creator?.avatarUrl ? (
                  <image
                    href={creator.avatarUrl}
                    x={-(hubPos.size || 56) / 2}
                    y={-(hubPos.size || 56) / 2}
                    width={hubPos.size || 56}
                    height={hubPos.size || 56}
                    clipPath="circle(50%)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <text textAnchor="middle" dominantBaseline="middle" fill="#09090b" fontSize="11" fontWeight="700">
                    YOU
                  </text>
                )}
                <text y={(hubPos.size || 56) / 2 + 14} textAnchor="middle" fill="#a1a1aa" fontSize="9">
                  {creator?.handle ? `@${creator.handle}` : 'Creator'}
                </text>
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
                    onClick={(ev) => {
                      ev.stopPropagation()
                      if (b.topContentId) onSelectPost?.(b.topContentId)
                    }}
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
                      <text
                        y={b.size / 2 + ringPad + 8}
                        textAnchor="middle"
                        fill="#d4d4d8"
                        fontSize="8"
                      >
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
              <p className="text-[11px] text-zinc-300 mt-0.5">
                {hover.primaryLabel}
                {hover.topTitle ? ` · ${hover.topTitle}` : ''}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {(SURFACE_LABELS[hover.primarySurface] || 'App')}
                {hover.primaryContentType && CONTENT_TYPE_LABELS[hover.primaryContentType]
                  ? ` · ${CONTENT_TYPE_LABELS[hover.primaryContentType]}`
                  : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {typeChips(hover.byType).map((c) => (
                  <span
                    key={c.id}
                    className="text-[10px] px-1.5 py-0.5 border border-zinc-700 text-zinc-300"
                    style={{ borderColor: c.color, boxShadow: `inset 0 0 0 1px ${c.color}` }}
                  >
                    {c.label} {c.n}
                  </span>
                ))}
              </div>
              {Object.keys(hover.byType || {}).length > 1 ? (
                <p className="text-[10px] text-zinc-500 mt-1">Multi-color rings on the node match these actions.</p>
              ) : null}
              <p className="text-[11px] text-zinc-500 mt-1.5">
                {hover.eventCount} events · last {formatWhen(hover.lastAt)}
              </p>
            </div>
          ) : null}

          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button type="button" onClick={() => setZoom((z) => Math.min(2.4, z + 0.15))} className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-sm font-bold">+</button>
            <button type="button" onClick={() => setZoom((z) => Math.max(0.55, z - 0.15))} className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-sm font-bold">−</button>
            <button type="button" onClick={resetView} className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-[10px] font-bold">⟲</button>
          </div>
          <p className="absolute bottom-3 left-3 text-[10px] text-zinc-600">Drag to pan · scroll to zoom</p>
        </div>

        <aside className="shrink-0 md:w-56 border-t md:border-t-0 md:border-l border-zinc-800 bg-[#0a0a0e] p-3 overflow-y-auto max-h-40 md:max-h-none">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Insights</p>
          <div className="space-y-2 text-[11px] text-zinc-400">
            <p>
              <span className="text-zinc-200 font-semibold">{summary.people || 0}</span> signed-in people
            </p>
            <p>
              <span className="text-zinc-200 font-semibold">{summary.total || 0}</span> tracked actions
            </p>
            {Object.entries(summary.byType || {}).slice(0, 6).map(([id, n]) => {
              const meta = INTERACTION_TYPES.find((t) => t.id === id)
              return (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5" style={{ background: meta?.color || '#71717a' }} />
                    {meta?.label || id}
                  </span>
                  <span className="text-zinc-300">{n}</span>
                </div>
              )
            })}
          </div>
          {topPeople.length ? (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Top engagers</p>
              <ul className="space-y-1.5">
                {topPeople.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 shrink-0" style={{ background: p.color }} />
                    <span className="truncate text-[11px] text-zinc-300">{personLabel(p)}</span>
                    <span className="ml-auto text-[10px] text-zinc-500">{p.weight}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
