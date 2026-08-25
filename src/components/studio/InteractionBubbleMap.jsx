import { useMemo, useState, useRef, useEffect } from 'react'
import { Info, X, Users, SlidersHorizontal, BarChart3, Radio } from 'lucide-react'
import { INTERACTION_TYPES } from '../../lib/creatorInteractions'
import { buildAudienceBubbleMap, layoutBubbleRing, layoutInnerVideos } from '../../lib/bubbleMapData'
import { cn } from '../../lib/utils'

const RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'all', label: 'All' },
]

function typeShort(type) {
  if (type === 'video') return 'Video'
  if (type === 'pic') return 'Pic'
  return 'Clip'
}

export default function InteractionBubbleMap({
  creatorId = null,
  creatorHandle = null,
  range = '7d',
  onRangeChange,
  selectedPostId = null,
  onSelectPost,
  postTitle = null,
}) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 640, h: 420 })
  const [hover, setHover] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const [mode, setMode] = useState('graph') // graph | users | videos
  const [kindFilter, setKindFilter] = useState('all')
  const [showLinks, setShowLinks] = useState(true)

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

  const graph = useMemo(
    () => buildAudienceBubbleMap(creatorId, creatorHandle, { contentId: selectedPostId, range }),
    [creatorId, creatorHandle, selectedPostId, range]
  )

  const filteredLinks = useMemo(() => {
    let list = graph.links || []
    if (kindFilter !== 'all') list = list.filter((l) => (l.kinds || []).includes(kindFilter))
    if (selectedPostId) list = list.filter((l) => l.contentId === selectedPostId)
    return list
  }, [graph.links, kindFilter, selectedPostId])

  const activeUserIds = useMemo(() => {
    if (kindFilter === 'all' && !selectedPostId) return null
    return new Set(filteredLinks.map((l) => l.userId))
  }, [filteredLinks, kindFilter, selectedPostId])

  const cx = size.w / 2
  const cy = size.h / 2
  const outerR = Math.max(90, Math.min(size.w, size.h) * 0.38)
  const innerR = Math.max(48, outerR * 0.38)

  const userNodes = useMemo(() => {
    let list = graph.users || []
    if (activeUserIds) list = list.filter((u) => activeUserIds.has(u.id))
    // Cap for readability; keep heaviest engagers + a sample of quiet platform users
    if (list.length > 48) {
      const engaged = list.filter((u) => u.engaged).slice(0, 36)
      const quiet = list.filter((u) => !u.engaged).slice(0, 12)
      list = [...engaged, ...quiet]
    }
    if (mode === 'videos') return []
    return layoutBubbleRing(list, {
      cx,
      cy,
      radius: outerR,
      minR: 8,
      maxR: mode === 'users' ? 42 : 28,
    })
  }, [graph.users, activeUserIds, mode, cx, cy, outerR])

  const videoNodes = useMemo(() => {
    if (mode === 'users') return []
    const list = graph.videos || []
    return layoutInnerVideos(list, {
      cx,
      cy,
      radius: mode === 'videos' ? outerR * 0.72 : innerR,
      minR: 16,
      maxR: mode === 'videos' ? 40 : 30,
    })
  }, [graph.videos, mode, cx, cy, outerR, innerR])

  const videoById = useMemo(
    () => Object.fromEntries(videoNodes.map((v) => [v.id, v])),
    [videoNodes]
  )
  const userById = useMemo(
    () => Object.fromEntries(userNodes.map((u) => [u.id, u])),
    [userNodes]
  )

  const drawnLinks = useMemo(() => {
    if (!showLinks || mode === 'users' || mode === 'videos') return []
    return filteredLinks
      .map((l) => {
        const u = userById[l.userId]
        const v = videoById[l.contentId]
        if (!u || !v) return null
        return { ...l, x1: u.x, y1: u.y, x2: v.x, y2: v.y }
      })
      .filter(Boolean)
      .slice(0, 120)
  }, [filteredLinks, userById, videoById, showLinks, mode])

  const empty = !userNodes.length && !videoNodes.length

  return (
    <div className="h-full min-h-0 flex flex-col bg-white border border-zinc-200">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className="h-8 w-8 inline-flex items-center justify-center border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400"
          aria-label="About this map"
          title="About this map"
        >
          <Info className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm font-semibold text-zinc-900 truncate">
            Audience Bubble Map{postTitle ? ` · ${postTitle}` : ''}
          </p>
          <p className="text-[11px] text-zinc-500">
            {graph.totals.platformUsers} anonymous viewers · {graph.totals.engagedUsers} engaged · {graph.totals.posts} posts
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-0.5 border border-zinc-200 p-0.5">
            <button
              type="button"
              onClick={() => setMode('graph')}
              title="Users + videos"
              className={cn('h-7 w-7 inline-flex items-center justify-center', mode === 'graph' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900')}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMode('users')}
              title="All users"
              className={cn('h-7 w-7 inline-flex items-center justify-center', mode === 'users' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900')}
            >
              <Users className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMode('videos')}
              title="Your videos"
              className={cn('h-7 w-7 inline-flex items-center justify-center', mode === 'videos' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900')}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowLinks((v) => !v)}
            title={showLinks ? 'Hide links' : 'Show links'}
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center border',
              showLinks ? 'border-zinc-900 text-zinc-900' : 'border-zinc-200 text-zinc-400'
            )}
          >
            <Radio className="h-3.5 w-3.5" />
          </button>
          {selectedPostId ? (
            <button
              type="button"
              onClick={() => onSelectPost?.(null)}
              className="h-8 w-8 inline-flex items-center justify-center border border-zinc-200 text-zinc-500 hover:text-zinc-900"
              aria-label="Clear post filter"
              title="Clear post filter"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {showInfo ? (
        <div className="shrink-0 px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-[11px] text-zinc-600">
          Outer bubbles are every platform account, shown anonymously (no names or handles). Size grows with
          likes, views, subs, comments, shares, and skips on your posts. Inner bubbles are your videos —
          tap one to highlight who interacted with it.
        </div>
      ) : null}

      <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-zinc-100">
        <div className="flex items-center gap-0.5 border border-zinc-200 p-0.5 mr-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRangeChange?.(r.id)}
              className={cn(
                'h-7 px-2.5 text-[11px] font-semibold',
                range === r.id ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setKindFilter('all')}
          className={cn(
            'h-7 px-2.5 text-[11px] font-medium border',
            kindFilter === 'all' ? 'border-zinc-900 text-zinc-900' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900'
          )}
        >
          All
        </button>
        {INTERACTION_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setKindFilter(t.id)}
            className={cn(
              'h-7 px-2.5 text-[11px] font-medium border inline-flex items-center gap-1.5',
              kindFilter === t.id ? 'border-zinc-900 text-zinc-900' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900'
            )}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
            {t.short}
          </button>
        ))}
        <div className="sm:hidden flex items-center gap-0.5 border border-zinc-200 p-0.5 ml-auto">
          {[
            { id: 'graph', label: 'Both' },
            { id: 'users', label: 'Users' },
            { id: 'videos', label: 'Posts' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                'h-7 px-2 text-[11px] font-semibold',
                mode === m.id ? 'bg-zinc-900 text-white' : 'text-zinc-500'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={wrapRef} className="relative flex-1 min-h-[280px] overflow-hidden bg-[radial-gradient(ellipse_at_center,_#f8fafc_0%,_#ffffff_55%,_#f1f5f9_100%)]">
        {empty ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm text-zinc-700">No audience bubbles yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Platform accounts appear as anonymous bubbles. They grow and connect to your videos as people watch, like, subscribe, share, comment, or skip.
              </p>
            </div>
          </div>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${size.w} ${size.h}`}
            className="absolute inset-0"
            role="img"
            aria-label="Anonymous audience bubble map"
          >
            {/* Soft ring guides */}
            {mode !== 'videos' ? (
              <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#e4e4e7" strokeWidth="1" strokeDasharray="4 6" />
            ) : null}
            {mode === 'graph' ? (
              <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#e4e4e7" strokeWidth="1" strokeDasharray="3 5" />
            ) : null}

            {drawnLinks.map((l, i) => (
              <path
                key={`${l.userId}_${l.contentId}_${i}`}
                d={`M ${l.x1} ${l.y1} Q ${cx} ${cy} ${l.x2} ${l.y2}`}
                fill="none"
                stroke={l.color || '#a1a1aa'}
                strokeOpacity={hover && (hover.id === l.userId || hover.id === l.contentId) ? 0.85 : 0.28}
                strokeWidth={Math.max(1, Math.min(3, l.strength / 3))}
              />
            ))}

            {userNodes.map((b) => {
              const active = hover?.id === b.id
              const dim = hover && hover.kind === 'video' && !filteredLinks.some((l) => l.userId === b.id && l.contentId === hover.id)
              return (
                <g
                  key={b.id}
                  transform={`translate(${b.x}, ${b.y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover({ ...b, kind: 'user' })}
                  onMouseLeave={() => setHover(null)}
                >
                  <circle
                    r={b.r}
                    fill={b.engaged ? '#e4e4e7' : '#f4f4f5'}
                    fillOpacity={dim ? 0.35 : active ? 0.95 : 0.85}
                    stroke={active ? '#18181b' : b.engaged ? '#a1a1aa' : '#d4d4d8'}
                    strokeWidth={active ? 2 : 1}
                  />
                  {b.r > 14 ? (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#52525b"
                      fontSize={Math.min(9, b.r / 2.2)}
                      fontWeight="600"
                    >
                      {b.r > 20 ? b.label.replace('Viewer ', '') : ''}
                    </text>
                  ) : null}
                </g>
              )
            })}

            {videoNodes.map((b) => {
              const active = hover?.id === b.id || selectedPostId === b.id
              return (
                <g
                  key={b.id}
                  transform={`translate(${b.x}, ${b.y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover({ ...b, kind: 'video' })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelectPost?.(selectedPostId === b.id ? null : b.id)}
                >
                  <circle
                    r={b.r}
                    fill={active ? '#18181b' : '#3f3f46'}
                    fillOpacity={0.92}
                    stroke={active ? '#18181b' : '#27272a'}
                    strokeWidth={2}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fafafa"
                    fontSize={Math.min(10, b.r / 2.4)}
                    fontWeight="700"
                  >
                    {typeShort(b.type).slice(0, 1)}
                  </text>
                </g>
              )
            })}
          </svg>
        )}

        {hover ? (
          <div
            className="pointer-events-none absolute z-20 max-w-xs border border-zinc-200 bg-white px-3 py-2 shadow-lg"
            style={{
              left: Math.min(size.w - 220, Math.max(8, hover.x - 80)),
              top: Math.max(8, hover.y - 72),
            }}
          >
            {hover.kind === 'user' ? (
              <>
                <p className="text-xs font-semibold text-zinc-900">{hover.label}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {hover.engaged
                    ? `Engaged with ${hover.postIds?.length || 0} of your posts`
                    : 'On the platform · no interactions with your posts yet'}
                </p>
                {hover.kinds?.length ? (
                  <p className="text-[11px] text-zinc-400 mt-1 capitalize">{hover.kinds.join(' · ')}</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-zinc-900 truncate">{hover.title}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {typeShort(hover.type)} · {hover.views || 0} views · {hover.likes || 0} likes · {hover.interactors || 0} linked viewers
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">Click to filter the map to this post</p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
