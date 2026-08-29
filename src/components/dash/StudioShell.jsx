/**
 * TikTok Studio–style white chrome (option B) for profile-menu pages.
 * Dark tone kept for any black shell that still uses this component.
 */
import { Bell, CircleHelp, ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/utils'
import { DashToneProvider, useDashTone } from './dashTone'
import ChannelAvatar from '../ChannelAvatar'
import { useAuth } from '../../context/AuthContext'

export { DashToneProvider, useDashTone }

export function StudioKpi({ label, value, hint, delta = null, icon: Icon = null }) {
  const light = useDashTone() === 'light'
  return (
    <div className={cn(
      'p-5',
      light ? 'rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]' : 'rounded-xl border border-white/10 bg-[#141414]'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-[13px]', light ? 'text-neutral-500' : 'text-zinc-500')}>{label}</p>
          <p className={cn('mt-2 text-[28px] font-bold tracking-tight tabular-nums leading-none', light ? 'text-neutral-900' : 'text-white')}>{value}</p>
          {hint ? <p className={cn('mt-2 text-[12px]', light ? 'text-neutral-400' : 'text-zinc-500')}>{hint}</p> : null}
          {delta != null ? (
            <p className={cn('mt-1.5 text-[12px] font-semibold', Number(delta) >= 0 ? (light ? 'text-neutral-900' : 'text-white') : (light ? 'text-rose-600' : 'text-rose-400'))}>
              {Number(delta) >= 0 ? '↑' : '↓'} {Math.abs(Number(delta)).toFixed(1)}% vs last 7 days
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className={cn(
            'h-10 w-10 shrink-0 flex items-center justify-center',
            light ? 'rounded-full bg-neutral-100 text-neutral-800' : 'rounded-full bg-white/5 text-zinc-200'
          )}>
            <Icon className="h-5 w-5" />
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
      light ? 'rounded-2xl border border-neutral-200 bg-white' : 'rounded-xl border border-white/10 bg-[#141414]',
      className
    )}>
      {(title || action) ? (
        <div className={cn('flex items-center justify-between gap-3 px-5 py-4', light ? 'border-b border-neutral-100' : 'border-b border-white/10')}>
          {title ? <h2 className={cn('text-[15px] font-semibold', light ? 'text-neutral-900' : 'text-white')}>{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className={cn('p-5', light ? 'text-neutral-700' : 'text-zinc-300')}>{children}</div>
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
            className={light ? 'w-full rounded-t bg-[#161823]' : 'w-full rounded-t bg-white'}
            style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
          />
          <span className={cn('text-[10px]', light ? 'text-neutral-400' : 'text-zinc-500')}>{labels[i] || ''}</span>
        </div>
      ))}
    </div>
  )
}

export function StudioPrimaryButton({ children, className = '', ...props }) {
  const light = useDashTone() === 'light'
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'h-10 px-5 rounded-lg text-[13px] font-semibold',
        light ? 'bg-neutral-900 text-white hover:bg-black' : 'bg-white text-black hover:bg-zinc-200',
        className
      )}
    >
      {children}
    </button>
  )
}

export default function StudioShell({
  title = 'Studio',
  nav = [],
  activeId = '',
  onNav,
  onBack,
  backLabel = 'Back',
  headerRight = null,
  onNotify,
  onHelp,
  children,
  className = '',
  tone = 'light',
}) {
  const light = tone === 'light'
  const { user } = useAuth()
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
  const pageTitle = nav.find((n) => n.id === activeId)?.label || title

  return (
    <DashToneProvider tone={light ? 'light' : 'dark'}>
      <div
        className={cn(
          'h-[calc(100dvh-3.5rem)] min-h-[480px] flex overflow-hidden',
          light ? 'bg-[#f8f8f8] text-neutral-900' : 'bg-black text-zinc-100',
          className
        )}
        data-studio={light ? 'tiktok-white' : 'twitch-black'}
      >
        <aside className={cn(
          'hidden md:flex w-[240px] shrink-0 flex-col border-r',
          light ? 'border-neutral-200 bg-white' : 'border-white/10 bg-[#0b0b0b]'
        )}>
          <div className={cn('px-3 py-4', light ? '' : 'border-b border-white/10')}>
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="h-10 w-10 inline-flex items-center justify-center bg-black text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
            {groups.map((g) => (
              <div key={g.name}>
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
                          'w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium text-left rounded-xl',
                          light
                            ? (active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900')
                            : (active ? 'text-white bg-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-white')
                        )}
                      >
                        {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className={cn('px-3 py-3 border-t space-y-2', light ? 'border-neutral-200' : 'border-white/10')}>
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className={cn(
                  'w-full h-9 px-3 rounded-lg text-[13px] font-semibold text-left',
                  light ? 'border border-neutral-200 text-neutral-800 hover:bg-neutral-50' : 'border border-white/15 text-white hover:bg-white/5'
                )}
              >
                ← {backLabel === 'Back' ? 'Back to calabi' : backLabel}
              </button>
            ) : null}
            <div className="flex items-center gap-2.5 px-1">
              <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={32} />
              <p className={cn('text-[13px] font-medium truncate', light ? 'text-neutral-900' : 'text-white')}>
                {user?.displayName || user?.handle || 'You'}
              </p>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className={cn(
            'shrink-0 flex items-center justify-between gap-3 px-6 md:px-8 py-5',
            light ? 'bg-[#f8f8f8]' : 'border-b border-white/10 bg-black'
          )}>
            <h1 className={cn('text-[28px] font-bold tracking-tight truncate', light ? 'text-neutral-900' : 'text-white')}>
              {pageTitle}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {light ? (
                <>
                  <button type="button" onClick={onNotify} aria-label="Notifications" className="h-9 w-9 inline-flex items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100">
                    <Bell className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={onHelp} aria-label="Help" className="h-9 w-9 inline-flex items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100">
                    <CircleHelp className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>
          </header>

          {nav.length ? (
            <div className={cn('md:hidden border-b px-3 py-2', light ? 'border-neutral-200 bg-white' : 'border-white/10 bg-black')}>
              <select
                value={activeId}
                onChange={(e) => onNav?.(e.target.value)}
                className={cn(
                  'w-full h-9 px-2 text-sm rounded-lg border',
                  light ? 'border-neutral-200 bg-white text-neutral-900' : 'border-white/10 bg-black text-white'
                )}
              >
                {nav.map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className={cn('flex-1 min-h-0 overflow-y-auto px-6 md:px-8 pb-8', light ? 'bg-[#f8f8f8]' : 'bg-black')}>
            {children}
          </div>
        </div>
      </div>
    </DashToneProvider>
  )
}
