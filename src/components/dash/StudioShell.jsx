/**
 * Shared dashboard chrome.
 * tone="light" = TikTok-white profile pages (Wallet, Settings, Messages…).
 * tone="dark"  = all-black Creator Studio / default.
 */
import { cn } from '../../lib/utils'
import { DashToneProvider, useDashTone } from './dashTone'

export { DashToneProvider, useDashTone }

export function StudioKpi({ label, value, hint, delta = null, icon: Icon = null }) {
  const light = useDashTone() === 'light'
  return (
    <div className={cn(
      'p-4',
      light ? 'rounded-xl border border-neutral-200 bg-white' : 'border border-[#272727] bg-[#18181f]'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-[11px] font-medium uppercase tracking-wide', light ? 'text-neutral-500' : 'text-zinc-500')}>{label}</p>
          <p className={cn('mt-2 text-2xl font-semibold tracking-tight tabular-nums', light ? 'text-neutral-900' : 'text-white')}>{value}</p>
          {hint ? <p className={cn('mt-1 text-[11px]', light ? 'text-neutral-400' : 'text-zinc-500')}>{hint}</p> : null}
          {delta != null ? (
            <p className={cn('mt-1 text-[11px] font-semibold', Number(delta) >= 0 ? (light ? 'text-emerald-600' : 'text-emerald-400') : (light ? 'text-rose-600' : 'text-rose-400'))}>
              {Number(delta) >= 0 ? '↑' : '↓'} {Math.abs(Number(delta)).toFixed(1)}%
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className={cn(
            'h-9 w-9 shrink-0 flex items-center justify-center',
            light ? 'rounded-full bg-neutral-100 text-neutral-700' : 'border border-[#272727] text-zinc-300'
          )}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function StudioCard({ title, action = null, children, className = '' }) {
  const light = useDashTone() === 'light'
  return (
    <div className={cn(
      light ? 'rounded-xl border border-neutral-200 bg-white' : 'border border-[#272727] bg-[#18181f]',
      className
    )}>
      {(title || action) ? (
        <div className={cn('flex items-center justify-between gap-3 px-4 py-3', light ? 'border-b border-neutral-100' : 'border-b border-[#272727]')}>
          {title ? <h2 className={cn('text-sm font-semibold', light ? 'text-neutral-900' : 'text-white')}>{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className={cn('p-4', light ? 'text-neutral-700' : 'text-zinc-300')}>{children}</div>
    </div>
  )
}

export function StudioAreaChart({ seriesA = [], seriesB = [], labels = [], height = 180 }) {
  const light = useDashTone() === 'light'
  const a = light ? '#161823' : '#ffffff'
  const b = light ? '#fe2c55' : '#a1a1aa'
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
      {area(seriesA, a)}
      {area(seriesB, b)}
      <polyline fill="none" stroke={a} strokeWidth="2.5" points={toPts(seriesA)} />
      {seriesB.length ? <polyline fill="none" stroke={b} strokeWidth="2.5" points={toPts(seriesB)} /> : null}
      {labels.length ? (
        <text x={pad} y={h - 2} className={light ? 'fill-neutral-400' : 'fill-zinc-500'} fontSize="10">{labels[0]}</text>
      ) : null}
    </svg>
  )
}

export function StudioBarChart({ values = [], labels = [] }) {
  const light = useDashTone() === 'light'
  const max = Math.max(1, ...values)
  return (
    <div className="flex items-end gap-2 h-40">
      {values.map((v, i) => (
        <div key={`${labels[i] || i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div
            className={light ? 'w-full rounded-t bg-[#161823]' : 'w-full bg-white/80'}
            style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
          />
          <span className={cn('text-[10px]', light ? 'text-neutral-400' : 'text-zinc-500')}>{labels[i] || ''}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * @param {{ tone?: 'light' | 'dark' }} props
 */
export default function StudioShell({
  title = 'Studio',
  nav = [],
  activeId = '',
  onNav,
  onBack,
  backLabel = 'Back',
  headerRight = null,
  children,
  className = '',
  tone = 'light',
}) {
  const light = tone === 'light'
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
    <DashToneProvider tone={light ? 'light' : 'dark'}>
      <div
        className={cn(
          'h-[calc(100dvh-3.5rem)] min-h-[480px] flex overflow-hidden',
          light ? 'bg-[#f8f8f8] text-neutral-900' : 'bg-[#0f0f0f] text-zinc-100',
          className
        )}
        data-studio={light ? 'tiktok-white' : 'twitch-black'}
      >
        <aside className={cn(
          'hidden md:flex w-56 shrink-0 flex-col border-r',
          light ? 'border-neutral-200 bg-white' : 'border-[#272727] bg-[#0f0f0f]'
        )}>
          <div className={cn('px-4 py-4 border-b', light ? 'border-neutral-100' : 'border-[#272727]')}>
            <p className={cn('text-sm font-semibold tracking-tight', light ? 'text-neutral-900' : 'text-white')}>{title}</p>
          </div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className={cn('mx-3 mt-3 h-9 px-2 text-left text-xs', light ? 'text-neutral-500 hover:text-neutral-900' : 'text-zinc-400 hover:text-white')}
            >
              ← {backLabel}
            </button>
          ) : null}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {groups.map((g) => (
              <div key={g.name}>
                <p className={cn('px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider', light ? 'text-neutral-400' : 'text-zinc-600')}>{g.name}</p>
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
                          light
                            ? (active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900')
                            : (active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white')
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
          <header className={cn(
            'h-14 shrink-0 border-b flex items-center justify-between gap-3 px-4 md:px-6',
            light ? 'border-neutral-200 bg-white' : 'border-[#272727] bg-[#0f0f0f]'
          )}>
            <p className={cn('text-sm font-semibold truncate', light ? 'text-neutral-900' : 'text-white')}>
              {nav.find((n) => n.id === activeId)?.label || title}
            </p>
            <div className="flex items-center gap-2 shrink-0">{headerRight}</div>
          </header>

          {nav.length ? (
            <div className={cn('md:hidden border-b px-3 py-2', light ? 'border-neutral-200 bg-white' : 'border-[#272727] bg-[#0f0f0f]')}>
              <select
                value={activeId}
                onChange={(e) => onNav?.(e.target.value)}
                className={cn(
                  'w-full h-9 px-2 text-sm rounded-lg border',
                  light ? 'border-neutral-200 bg-white text-neutral-900' : 'border-[#272727] bg-[#0f0f0f] text-white'
                )}
              >
                {nav.map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className={cn('flex-1 min-h-0 overflow-y-auto p-4 md:p-6', light ? 'bg-[#f8f8f8]' : 'bg-[#0f0f0f]')}>
            {children}
          </div>
        </div>
      </div>
    </DashToneProvider>
  )
}
