import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  ExternalLink,
  Sparkles,
  XCircle,
} from 'lucide-react'
import {
  CREATOR_STUDIO_GROUPS,
  KICK_TWITCH_PARITY,
  countParityByStatus,
  navigateStudioItem,
  statusLabel,
} from '../../lib/creatorStudioCatalog'
import { applyStatusLabel, getSetupStepState } from '../../lib/creatorSetup'
import { cn } from '../../lib/utils'

function StepIcon({ status }) {
  if (status === 'done') return <Check className="h-3.5 w-3.5 text-emerald-400" />
  if (status === 'pending') return <Clock className="h-3.5 w-3.5 text-amber-400" />
  if (status === 'rejected') return <XCircle className="h-3.5 w-3.5 text-red-400" />
  return <Circle className="h-3.5 w-3.5 text-zinc-600" />
}

function CatalogItemButton({ item, onNavigate, handlers }) {
  const disabled = !item.route
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => navigateStudioItem(onNavigate, item, handlers)}
      className={cn(
        'w-full text-left px-2.5 py-2 border border-zinc-800 bg-[#0c0c10] hover:border-zinc-600 disabled:opacity-40 disabled:hover:border-zinc-800',
        item.status === 'live' && 'border-zinc-700'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white">{item.label}</span>
        <span
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wide',
            item.status === 'live' && 'text-emerald-400',
            item.status === 'partial' && 'text-amber-400',
            item.status === 'planned' && 'text-zinc-500'
          )}
        >
          {statusLabel(item.status)}
        </span>
      </div>
    </button>
  )
}

export default function CreatorSetupHub({
  user,
  onNavigate,
  onOpenUpload,
  onOpenImport,
  onReopenOnboarding,
}) {
  const setup = useMemo(() => getSetupStepState(user), [user])
  const parity = useMemo(() => countParityByStatus(KICK_TWITCH_PARITY, 'clips'), [])
  const [showCatalog, setShowCatalog] = useState(false)
  const [showParity, setShowParity] = useState(false)

  const handlers = { onOpenUpload, onOpenImport }
  const applyLabel = applyStatusLabel(setup.applyStatus)

  const goStep = (step) => {
    if (step.route?.action === 'upload') {
      onOpenUpload?.()
      return
    }
    if (step.route?.section) onNavigate?.(step.route.view, step.route.section)
    else if (step.route?.view) onNavigate?.(step.route.view)
  }

  return (
    <div className="space-y-3">
      <div className="border border-zinc-800 bg-[#0c0c10] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Creator setup
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {setup.doneCount} of {setup.total} complete · {setup.pct}%
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                'h-7 px-2 inline-flex items-center text-[10px] font-semibold border',
                setup.applyStatus === 'approved' && 'border-emerald-900/50 bg-emerald-950/40 text-emerald-200',
                setup.applyStatus === 'pending' && 'border-amber-900/50 bg-amber-950/40 text-amber-200',
                setup.applyStatus === 'rejected' && 'border-red-900/50 bg-red-950/40 text-red-200',
                setup.applyStatus === 'none' && 'border-zinc-800 text-zinc-400'
              )}
            >
              Apply: {applyLabel}
            </span>
            {onReopenOnboarding ? (
              <button
                type="button"
                onClick={onReopenOnboarding}
                className="h-7 px-2 text-[10px] font-semibold border border-zinc-700 text-zinc-300"
              >
                Finish setup tour
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-2 h-1.5 bg-zinc-900 overflow-hidden">
          <div className="h-full bg-white transition-all" style={{ width: `${setup.pct}%` }} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {setup.steps.map((step) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => goStep(step)}
                className="w-full flex items-start gap-2 text-left px-2 py-1.5 hover:bg-[#18181f]"
              >
                <StepIcon status={step.status} />
                <span className="min-w-0 flex-1">
                  <span className={cn('text-xs font-medium', step.done ? 'text-zinc-400 line-through' : 'text-white')}>
                    {step.label}
                  </span>
                  <span className="block text-[10px] text-zinc-500 leading-snug">{step.hint}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 mt-0.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-zinc-800 bg-[#0c0c10]">
        <button
          type="button"
          onClick={() => setShowCatalog((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="text-sm font-semibold text-white">Studio tools</span>
          <ChevronDown className={cn('h-4 w-4 text-zinc-500 transition-transform', showCatalog && 'rotate-180')} />
        </button>
        {showCatalog ? (
          <div className="px-3 pb-3 space-y-3 border-t border-zinc-800">
            {CREATOR_STUDIO_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="text-[11px] font-semibold text-zinc-300 mt-2">{group.label}</p>
                <p className="text-[10px] text-zinc-600 mb-1.5">{group.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {group.items.map((item) => (
                    <CatalogItemButton
                      key={item.id}
                      item={item}
                      onNavigate={onNavigate}
                      handlers={handlers}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border border-zinc-800 bg-[#0c0c10]">
        <button
          type="button"
          onClick={() => setShowParity((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="text-sm font-semibold text-white">Kick / Twitch parity</span>
          <span className="text-[10px] text-zinc-500">
            {parity.live} live · {parity.partial} partial · {parity.planned} planned
          </span>
        </button>
        {showParity ? (
          <div className="px-3 pb-3 border-t border-zinc-800 max-h-48 overflow-y-auto">
            <table className="w-full text-[10px] mt-2">
              <thead>
                <tr className="text-zinc-500 text-left">
                  <th className="pb-1 font-medium">Feature</th>
                  <th className="pb-1 font-medium">calabi</th>
                </tr>
              </thead>
              <tbody>
                {KICK_TWITCH_PARITY.map((row) => (
                  <tr key={row.feature} className="border-t border-zinc-900">
                    <td className="py-1 pr-2 text-zinc-300">{row.feature}</td>
                    <td className="py-1 text-zinc-400">
                      {statusLabel(row.clips)}
                      {row.note ? (
                        <span className="block text-zinc-600 leading-snug">{row.note}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => onNavigate?.('settings', 'revenue')}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
            >
              Revenue details <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
