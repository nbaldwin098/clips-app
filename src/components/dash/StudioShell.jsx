/**
 * Simple black studio dashboard. Same tokens as the site and Admin.
 */
import { cn } from '../../lib/utils'

export function StudioKpi({ label, value, hint, delta = null, icon: Icon = null }) {
  return (
    <div className="border border-[#272727] bg-[#18181f] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-zinc-500">{hint}</p> : null}
          {delta != null ? (
            <p className={cn('mt-1 text-[11px] font-semibold', Number(delta) >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {Number(delta) >= 0 ? '↑' : '↓'} {Math.abs(Number(delta)).toFixed(1)}%
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className="h-9 w-9 shrink-0 border border-[#272727] text-zinc-300 flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function StudioCard({ title, action = null, children, className = '' }) {
  return (
    <div className={cn('border border-[#272727] bg-[#18181f]', className)}>
      {(title || action) ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#272727] px-4 py-3">
          {title ? <h2 className="text-sm font-semibold text-white">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className="p-4 text-zinc-300">{children}</div>
    </div>
  )
}

export function StudioAreaChart({ seriesA = [], seriesB = [], labels = [], height = 180 }) {
  const w = 560
  const h = height
  const pad = 16
  const all = [...seriesA, ...seriesB]
  const max = Math.max(1, ...all)
  const toPts = (arr) => arr.map((v, i) => {
    const x = pad + (i / Math.max(1, arr.length - 1)) * (w - pad * 2)
    const y = h - pad - (v / max) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const area = (arr, color) => {
    if (!arr.length) return null
    const line = toPts(arr)
    const first = line.split(' ')[0]
    const last = line.split(' ').slice(-1)[0]
    const [lx] = last.split(',')
    const [fx] = first.split(',')
    return <polygon points={`${fx},${h - pad} ${line} ${lx},${h - pad}`} fill={color} opacity="0.18" />
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Chart">
      {area(seriesA, '#ffffff')}
      {area(seriesB, '#a1a1aa')}
      <polyline fill="none" stroke="#ffffff" strokeWidth="2" points={toPts(seriesA)} />
      {seriesB.length ? <polyline fill="none" stroke="#a1a1aa" strokeWidth="2" points={toPts(seriesB)} /> : null}
      {labels.length ? (
        <text x={pad} y={h - 2} className="fill-zinc-500" fontSize="10">{labels[0]}</text>
      ) : null}
    </svg>
  )
}

export function StudioBarChart({ values = [], labels = [] }) {
  const max = Math.max(1, ...values)
  return (
    <div className="flex items-end gap-2 h-40">
      {values.map((v, i) => (
        <div key={`${labels[i] || i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div className="w-full bg-white/80" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
          <span className="text-[10px] text-zinc-500">{labels[i] || ''}</span>
        </div>
      ))}
    </div>
  )
}

export default function StudioShell({
  title = 'Studio',
  nav = [],
  activeId = '',
  onNav,
  onBack,
  backLabel = 'Back to site',
  headerRight = null,
  children,
  className = '',
}) {
  const groups = []
  for (const item of nav) {
    const g = item.group || 'Menu'
    let bucket = groups.find((x) => x.name === g)
    if (!bucket) {
      bucket = { name: g, items: [] }
      groups.push(bucket)
    }
    bucket.items.push(item)
  }
  return (
    <div className={cn('h-[calc(100dvh-3.5rem)] min-h-[480px] flex bg-[#0f0f0f] text-zinc-100 overflow-hidden', className)} data-studio="tiktok-white">
      <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-[#272727] bg-[#0f0f0f]">
        <div className="px-4 py-4 border-b border-[#272727]">
          <p className="text-sm font-semibold text-white tracking-tight">{title}</p>
        </div>
        {onBack ? (
          <button type="button" onClick={onBack} className="mx-3 mt-3 h-9 px-2 text-left text-xs text-zinc-500 hover:text-white">
            ← {backLabel}
          </button>
        ) : null}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {groups.map((g) => (
            <div key={g.name}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{g.name}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = item.icon
                  const active = activeId === item.id
                  return (
                    <button key={item.id} type="button" onClick={() => onNav?.(item.id)} className={cn('w-full flex items-center gap-2.5 h-9 px-3 text-sm text-left', active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white')}>
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col bg-[#0f0f0f]">
        <header className="h-14 shrink-0 border-b border-[#272727] bg-[#0f0f0f] flex items-center justify-between gap-3 px-4 md:px-6">
          <p className="text-sm font-semibold text-white truncate">{nav.find((n) => n.id === activeId)?.label || title}</p>
          <div className="flex items-center gap-2 shrink-0">{headerRight}</div>
        </header>
        {nav.length ? (
          <div className="md:hidden border-b border-[#272727] bg-[#0f0f0f] px-3 py-2">
            <select value={activeId} onChange={(e) => onNav?.(e.target.value)} className="w-full h-9 border border-[#272727] bg-[#0f0f0f] px-2 text-sm text-white">
              {nav.map((n) => (<option key={n.id} value={n.id}>{n.label}</option>))}
            </select>
          </div>
        ) : null}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">{children}</div>
      </div>
    </div>
  )
}
