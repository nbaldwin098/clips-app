import { useMemo, useState, useRef, useEffect } from 'react'
import { INTERACTION_TYPES, summarizeBubbles } from '../../lib/creatorInteractions'
import { cn } from '../../lib/utils'

const RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'all', label: 'All' },
]

function layoutBubbles(nodes, width, height) {
  if (!nodes.length || width < 40 || height < 40) return []
  const times = nodes.map((n) => n.at)
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const span = Math.max(1, maxT - minT)
  const typeIndex = Object.fromEntries(INTERACTION_TYPES.map((t, i) => [t.id, i]))
  const typeCount = INTERACTION_TYPES.length
  const padX = 48
  const padY = 36
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  return nodes.map((n, i) => {
    const ti = typeIndex[n.type] ?? 0
    const x = padX + ((n.at - minT) / span) * innerW
    const band = (ti + 0.5) / typeCount
    const jitter = ((i * 37) % 11) / 11 - 0.5
    const y = padY + band * innerH + jitter * (innerH / typeCount) * 0.35
    const size = Math.min(56, Math.max(14, 10 + Math.sqrt(n.weight || 1) * 8 + (n.count ? Math.log2(n.count + 1) * 3 : 0)))
    return { ...n, x, y, size, minT, maxT }
  })
}

function formatWhen(ms) {
  if (!ms) return '—'
  const d = new Date(ms)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function InteractionBubbleMap({
  nodes = [],
  range = '7d',
  onRangeChange,
  selectedPostId = null,
  onSelectPost,
  postTitle = null,
}) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 640, h: 420 })
  const [hover, setHover] = useState(null)
  const [filter, setFilter] = useState('all')
  const [zoom, setZoom] = useState(1)

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

  const filtered = useMemo(() => {
    let list = nodes
    if (filter !== 'all') list = list.filter((n) => n.type === filter)
    return list
  }, [nodes, filter])

  const laid = useMemo(() => layoutBubbles(filtered, size.w / zoom, size.h / zoom), [filtered, size, zoom])
  const summary = useMemo(() => summarizeBubbles(filtered), [filtered])

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#0a0a0e] border border-zinc-800">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">
            Interaction map{postTitle ? ` · ${postTitle}` : ''}
          </p>
          <p className="text-[11px] text-zinc-500">
            When people clicked, liked, subscribed, shared, commented, or skipped your posts
            {summary.nodes ? ` · ${summary.nodes} bubbles` : ''}
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
          All
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

      <div ref={wrapRef} className="relative flex-1 min-h-[280px] overflow-hidden">
        {!laid.length ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm text-zinc-300">No interactions in this range yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Bubbles appear as people watch, like, subscribe, share, comment, or skip your posts. Tallies from older traffic may show as larger seeded bubbles.
              </p>
            </div>
          </div>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${size.w / zoom} ${size.h / zoom}`}
            className="absolute inset-0"
            role="img"
            aria-label="Creator interaction bubble map"
          >
            <defs>
              <pattern id="studio-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a22" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#studio-grid)" />

            {/* Time axis label */}
            <text x="48" y={(size.h / zoom) - 12} fill="#52525b" fontSize="10">Earlier</text>
            <text x={(size.w / zoom) - 48} y={(size.h / zoom) - 12} fill="#52525b" fontSize="10" textAnchor="end">Recent</text>

            {INTERACTION_TYPES.map((t, i) => {
              const y = 36 + ((i + 0.5) / INTERACTION_TYPES.length) * ((size.h / zoom) - 72)
              return (
                <text key={t.id} x="10" y={y} fill="#3f3f46" fontSize="9" dominantBaseline="middle">
                  {t.short}
                </text>
              )
            })}

            {laid.map((b) => (
              <g
                key={b.id}
                transform={`translate(${b.x}, ${b.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHover(b)}
                onMouseLeave={() => setHover(null)}
                onClick={() => b.contentId && onSelectPost?.(b.contentId)}
              >
                <circle
                  r={b.size / 2}
                  fill={b.color}
                  fillOpacity={hover?.id === b.id ? 0.95 : 0.72}
                  stroke={hover?.id === b.id ? '#fff' : 'transparent'}
                  strokeWidth={2}
                />
                {(b.size > 22) && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#0a0a0e"
                    fontSize={Math.min(11, b.size / 3)}
                    fontWeight="700"
                  >
                    {b.count || b.weight}
                  </text>
                )}
              </g>
            ))}
          </svg>
        )}

        {hover ? (
          <div
            className="pointer-events-none absolute z-20 max-w-xs border border-zinc-700 bg-[#121218] px-3 py-2 shadow-xl"
            style={{
              left: Math.min(size.w - 220, Math.max(8, (hover.x * zoom) - 80)),
              top: Math.max(8, (hover.y * zoom) - 70),
            }}
          >
            <p className="text-xs font-semibold text-white">{hover.short} · {hover.title}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{formatWhen(hover.at)}</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              {hover.count ? `${hover.count} total` : `Weight ${hover.weight}`}
              {hover.source === 'tally' ? ' · from post totals' : ' · live event'}
            </p>
          </div>
        ) : null}

        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.15))} className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-sm font-bold">+</button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))} className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-sm font-bold">−</button>
          <button type="button" onClick={() => setZoom(1)} className="h-8 w-8 border border-zinc-700 bg-[#121218] text-white text-[10px] font-bold">1×</button>
        </div>
      </div>
    </div>
  )
}
