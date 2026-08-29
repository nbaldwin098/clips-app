import { cn } from '../../lib/utils'
import { useDashTone } from '../dash/dashTone'

const FIELD_LIGHT = 'mt-1 w-full h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900'
const FIELD_DARK = 'mt-1 w-full h-10 border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-white'
const TEXTAREA_LIGHT = 'mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900'
const TEXTAREA_DARK = 'mt-1 w-full border border-[#272727] bg-[#0f0f0f] px-3 py-2 text-sm text-white'

export function useSettingsFieldClass() {
  return useDashTone() === 'light' ? FIELD_LIGHT : FIELD_DARK
}

export function useSettingsTextareaClass() {
  return useDashTone() === 'light' ? TEXTAREA_LIGHT : TEXTAREA_DARK
}

/** Light field tokens — site Settings (B). Studio uses the hooks above. */
export const SETTINGS_FIELD = FIELD_LIGHT
export const SETTINGS_TEXTAREA = TEXTAREA_LIGHT

export function SettingsPageHeader({ title, subtitle, actions }) {
  const light = useDashTone() === 'light'
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className={cn('text-xl font-semibold', light ? 'text-neutral-900' : 'text-white')}>{title}</h1>
        {subtitle ? <p className={cn('mt-1 text-sm', light ? 'text-neutral-500' : 'text-zinc-500')}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

export function SettingsSection({ title, description, divider = false, children, className }) {
  const light = useDashTone() === 'light'
  return (
    <section className={cn(divider && (light ? 'pt-6 border-t border-neutral-200' : 'pt-6 border-t border-[#272727]'), 'space-y-4', className)}>
      {title ? <h2 className={cn('text-sm font-semibold', light ? 'text-neutral-900' : 'text-white')}>{title}</h2> : null}
      {description ? <p className={cn('text-sm', light ? 'text-neutral-500' : 'text-zinc-500')}>{description}</p> : null}
      {children}
    </section>
  )
}

export function SettingsCard({ title, description, children, className, headerAction }) {
  const light = useDashTone() === 'light'
  return (
    <div className={cn(
      'overflow-hidden',
      light ? 'rounded-xl border border-neutral-200 bg-white' : 'border border-[#272727] bg-[#18181f]',
      className
    )}>
      {title || description || headerAction ? (
        <div className={cn('px-4 py-3 flex items-start justify-between gap-3', light ? 'border-b border-neutral-100' : 'border-b border-[#272727]')}>
          <div>
            {title ? <p className={cn('text-sm font-semibold', light ? 'text-neutral-900' : 'text-white')}>{title}</p> : null}
            {description ? <p className={cn('text-[11px] mt-0.5', light ? 'text-neutral-500' : 'text-zinc-500')}>{description}</p> : null}
          </div>
          {headerAction}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function SettingsKpiGrid({ items, columns = 4 }) {
  const light = useDashTone() === 'light'
  const gridClass =
    columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'
  return (
    <div className={cn('grid gap-3', gridClass)}>
      {items.map((item) => (
        <div key={item.label} className={light ? 'rounded-xl border border-neutral-200 bg-white p-4' : 'border border-[#272727] bg-[#18181f] p-4'}>
          <p className={cn('text-[11px]', light ? 'text-neutral-500' : 'text-zinc-500')}>{item.label}</p>
          <p className={cn('mt-1 text-2xl font-semibold tabular-nums', light ? 'text-neutral-900' : 'text-white')}>{item.value}</p>
          {item.hint ? <p className={cn('mt-1 text-[11px]', light ? 'text-neutral-400' : 'text-zinc-500')}>{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}

export function SettingsTabs({ tabs, active, onChange }) {
  const light = useDashTone() === 'light'
  return (
    <div className={cn('flex gap-5 border-b', light ? 'border-neutral-200' : 'border-[#272727]')}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'h-9 text-sm font-medium border-b-2 -mb-px',
            active === tab.id
              ? (light ? 'text-neutral-900 border-neutral-900' : 'text-white border-white')
              : (light ? 'text-neutral-500 border-transparent hover:text-neutral-900' : 'text-zinc-500 border-transparent hover:text-white')
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsRangePicker({ ranges, value, onChange }) {
  const light = useDashTone() === 'light'
  return (
    <div className={cn('flex p-0.5', light ? 'rounded-lg border border-neutral-200 bg-white' : 'border border-[#272727] bg-[#18181f]')}>
      {ranges.map((range) => (
        <button
          key={range.id}
          type="button"
          onClick={() => onChange(range.id)}
          className={cn(
            'h-8 px-2.5 text-[11px] font-semibold',
            light && 'rounded-md',
            value === range.id
              ? (light ? 'bg-neutral-900 text-white' : 'bg-white text-black')
              : (light ? 'text-neutral-500 hover:text-neutral-900' : 'text-zinc-500 hover:text-white')
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsField({ label, hint, children, className }) {
  const light = useDashTone() === 'light'
  return (
    <label className={cn('block', className)}>
      {label ? <span className={cn('text-xs font-medium', light ? 'text-neutral-500' : 'text-zinc-500')}>{label}</span> : null}
      {children}
      {hint ? <p className={cn('mt-1 text-[11px]', light ? 'text-neutral-500' : 'text-zinc-500')}>{hint}</p> : null}
    </label>
  )
}

export function SettingsSelect({ label, hint, className, ...props }) {
  const field = useSettingsFieldClass()
  return (
    <SettingsField label={label} hint={hint} className={className}>
      <select {...props} className={cn(field, props.className, className)} />
    </SettingsField>
  )
}

export function SettingsInput({ label, hint, className, ...props }) {
  const field = useSettingsFieldClass()
  return (
    <SettingsField label={label} hint={hint} className={className}>
      <input {...props} className={cn(field, props.className)} />
    </SettingsField>
  )
}

export function SettingsToggle({ label, description, checked, onChange, disabled }) {
  const light = useDashTone() === 'light'
  return (
    <label className={cn('flex items-start gap-3', disabled && 'opacity-50')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className={cn('mt-1 h-4 w-4', light ? 'rounded border-neutral-300 bg-white' : 'border-[#272727] bg-[#0f0f0f]')}
      />
      <span>
        <span className={cn('text-sm', light ? 'text-neutral-900' : 'text-white')}>{label}</span>
        {description ? <p className={cn('text-[11px] mt-0.5', light ? 'text-neutral-500' : 'text-zinc-500')}>{description}</p> : null}
      </span>
    </label>
  )
}

export function SettingsButton({ variant = 'primary', className, children, ...props }) {
  const light = useDashTone() === 'light'
  const styles = variant === 'primary'
    ? (light ? 'bg-neutral-900 text-white' : 'bg-white text-black')
    : variant === 'ghost'
      ? (light ? 'border border-neutral-200 text-neutral-800' : 'border border-[#272727] text-zinc-200')
      : (light ? 'text-neutral-900 underline' : 'text-white underline')
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'h-9 px-4 text-sm font-medium disabled:opacity-50',
        variant !== 'link' && (light ? 'rounded-lg' : ''),
        variant !== 'link' && styles,
        className
      )}
    >
      {children}
    </button>
  )
}

export function SettingsNotice({ tone = 'info', children, action }) {
  const light = useDashTone() === 'light'
  const toneClass = tone === 'warn'
    ? (light ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-amber-500/30 bg-amber-500/10 text-amber-200')
    : tone === 'success'
      ? (light ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200')
      : (light ? 'border-neutral-200 bg-neutral-50 text-neutral-700' : 'border-[#272727] bg-[#18181f] text-zinc-300')
  return (
    <div className={cn('border p-4 text-sm space-y-3', light && 'rounded-xl', toneClass)}>
      <div>{children}</div>
      {action}
    </div>
  )
}

export function SettingsStatList({ items }) {
  const light = useDashTone() === 'light'
  return (
    <dl className={cn('space-y-2 text-xs', light ? 'text-neutral-500' : 'text-zinc-500')}>
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-2">
          <dt>{item.label}</dt>
          <dd className={cn('tabular-nums', light ? 'text-neutral-900' : 'text-white')}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SettingsTable({ columns, rows, emptyMessage = 'Nothing to list.' }) {
  const light = useDashTone() === 'light'
  if (!rows?.length) {
    return <p className={cn('text-sm text-center py-12', light ? 'text-neutral-500' : 'text-zinc-500')}>{emptyMessage}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className={cn('text-[11px] uppercase tracking-wide border-b', light ? 'text-neutral-500 border-neutral-200' : 'text-zinc-500 border-[#272727]')}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn('font-medium px-4 py-2.5', col.align === 'right' && 'text-right')}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={cn('border-b last:border-0', light ? 'border-neutral-100' : 'border-[#272727]')}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-2.5',
                    col.align === 'right' && 'text-right',
                    col.muted
                      ? (light ? 'text-neutral-500' : 'text-zinc-500')
                      : (light ? 'text-neutral-800' : 'text-zinc-200'),
                    col.truncate && 'max-w-[280px] truncate'
                  )}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SettingsSaveHint({ saving, saved, idle = 'Saved as you type.' }) {
  const light = useDashTone() === 'light'
  const text = saving ? 'Saving…' : saved ? 'Saved' : idle
  return <p className={cn('text-[11px]', light ? 'text-neutral-500' : 'text-zinc-500')}>{text}</p>
}
