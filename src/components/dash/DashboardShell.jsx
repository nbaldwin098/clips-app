/**
 * TailAdmin chrome: dark navy rail + white content cards.
 * Used by Admin portal. Profile-menu pages use StudioShell (TikTok-white).
 */
import { cn } from '../../lib/utils'

export function DashKpi({ label, value, hint, icon: Icon, delta = null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
          {delta != null ? (
            <p className={cn('mt-1 text-[11px] font-semibold', Number(delta) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
              {Number(delta) >= 0 ? '↑' : '↓'} {Math.abs(Number(delta)).toFixed(2)}%
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className="h-10 w-10 shrink-0 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function DashCard({ title, action = null, children, className = '' }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || action) ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  )
}

/** Simple SVG area chart — no chart library. */
export function DashAreaChart({ seriesA = [], seriesB = [], labels = [], height = 180 }) {
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
    return (
      <polygon
        points={`${fx},${h - pad} ${line} ${lx},${h - pad}`}
        fill={color}
        opacity="0.2"
      />
    )
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Chart">
      {area(seriesA, '#3b82f6')}
      {area(seriesB, '#93c5fd')}
      <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={toPts(seriesA)} />
      <polyline fill="none" stroke="#93c5fd" strokeWidth="2.5" points={toPts(seriesB)} />
      {labels.length ? (
        <text x={pad} y={h - 2} className="fill-slate-400" fontSize="10">{labels[0]}</text>
      ) : null}
    </svg>
  )
}

export function DashBarChart({ values = [], labels = [] }) {
  const max = Math.max(1, ...values)
  return (
    <div className="flex items-end gap-2 h-40">
      {values.map((v, i) => (
        <div key={`${labels[i] || i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div className="w-full rounded-t bg-sky-500/90" style={{ height: `${(v / max) * 100}%`, minHeight: 4 }} />
          <span className="text-[10px] text-slate-400">{labels[i] || ''}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * @param {{
 *   title?: string,
 *   nav?: { id: string, label: string, icon?: any, group?: string }[],
 *   activeId?: string,
 *   onNav?: (id: string) => void,
 *   onBack?: () => void,
 *   backLabel?: string,
 *   headerRight?: any,
 *   children: any,
 *   className?: string,
 * }} props
 */
export default function DashboardShell({
  title = 'Dashboard',
  nav = [],
  activeId = '',
  onNav,
  onBack,
  backLabel = 'Site',
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
    <div className={cn('h-[calc(100dvh-3.5rem)] min-h-[480px] flex bg-slate-100 text-slate-900 overflow-hidden', className)}>
      <aside className="hidden md:flex w-56 shrink-0 flex-col bg-[#1c2434] text-slate-200">
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white tracking-tight">{title}</p>
        </div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mx-3 mt-3 h-9 px-2 text-left text-xs text-slate-400 hover:text-white"
          >
            ← {backLabel}
          </button>
        ) : null}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g.name}>
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{g.name}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = item.icon
                  const active = activeId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNav?.(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-left rounded-lg',
                        active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
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

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between gap-3 px-4 md:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {nav.find((n) => n.id === activeId)?.label || title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">{headerRight}</div>
        </header>

        {nav.length ? (
          <div className="md:hidden border-b border-slate-200 bg-white px-3 py-2">
            <select
              value={activeId}
              onChange={(e) => onNav?.(e.target.value)}
              className="w-full h-9 border border-slate-200 bg-white px-2 text-sm text-slate-900 rounded-lg"
            >
              {nav.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
