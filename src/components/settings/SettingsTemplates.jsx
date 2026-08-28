import { cn } from '../../lib/utils'

/** TikTok-white field tokens (profile-menu / studio settings). */
export const SETTINGS_FIELD =
  'mt-1 w-full h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900'

export const SETTINGS_TEXTAREA =
  'mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900'

export function SettingsPageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

export function SettingsSection({ title, description, divider = false, children, className }) {
  return (
    <section className={cn(divider && 'pt-6 border-t border-neutral-200', 'space-y-4', className)}>
      {title ? <h2 className="text-sm font-semibold text-neutral-900">{title}</h2> : null}
      {description ? <p className="text-sm text-neutral-500">{description}</p> : null}
      {children}
    </section>
  )
}

export function SettingsCard({ title, description, children, className, headerAction }) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-white overflow-hidden', className)}>
      {title || description || headerAction ? (
        <div className="px-4 py-3 border-b border-neutral-100 flex items-start justify-between gap-3">
          <div>
            {title ? <p className="text-sm font-semibold text-neutral-900">{title}</p> : null}
            {description ? <p className="text-[11px] text-neutral-500 mt-0.5">{description}</p> : null}
          </div>
          {headerAction}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function SettingsKpiGrid({ items, columns = 4 }) {
  const gridClass =
    columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'
  return (
    <div className={cn('grid gap-3', gridClass)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] text-neutral-500">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">{item.value}</p>
          {item.hint ? <p className="mt-1 text-[11px] text-neutral-400">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}

export function SettingsTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-5 border-b border-neutral-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'h-9 text-sm font-medium border-b-2 -mb-px',
            active === tab.id
              ? 'text-neutral-900 border-neutral-900'
              : 'text-neutral-500 border-transparent hover:text-neutral-900'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsRangePicker({ ranges, value, onChange }) {
  return (
    <div className="flex rounded-lg border border-neutral-200 p-0.5 bg-white">
      {ranges.map((range) => (
        <button
          key={range.id}
          type="button"
          onClick={() => onChange(range.id)}
          className={cn(
            'h-8 px-2.5 rounded-md text-[11px] font-semibold',
            value === range.id ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsField({ label, hint, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label ? <span className="text-xs font-medium text-neutral-500">{label}</span> : null}
      {children}
      {hint ? <p className="mt-1 text-[11px] text-neutral-500">{hint}</p> : null}
    </label>
  )
}

export function SettingsSelect({ label, hint, className, ...props }) {
  return (
    <SettingsField label={label} hint={hint} className={className}>
      <select {...props} className={cn(SETTINGS_FIELD, props.className, className)} />
    </SettingsField>
  )
}

export function SettingsInput({ label, hint, className, ...props }) {
  return (
    <SettingsField label={label} hint={hint} className={className}>
      <input {...props} className={cn(SETTINGS_FIELD, props.className)} />
    </SettingsField>
  )
}

export function SettingsToggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={cn('flex items-start gap-3', disabled && 'opacity-50')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-neutral-300 bg-white"
      />
      <span>
        <span className="text-sm text-neutral-900">{label}</span>
        {description ? <p className="text-[11px] text-neutral-500 mt-0.5">{description}</p> : null}
      </span>
    </label>
  )
}

export function SettingsButton({ variant = 'primary', className, children, ...props }) {
  const styles =
    variant === 'primary'
      ? 'bg-neutral-900 text-white'
      : variant === 'ghost'
        ? 'border border-neutral-200 text-neutral-800'
        : 'text-neutral-900 underline'
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'h-9 px-4 rounded-lg text-sm font-medium disabled:opacity-50',
        variant !== 'link' && styles,
        className
      )}
    >
      {children}
    </button>
  )
}

export function SettingsNotice({ tone = 'info', children, action }) {
  const toneClass =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-neutral-200 bg-neutral-50 text-neutral-700'
  return (
    <div className={cn('rounded-xl border p-4 text-sm space-y-3', toneClass)}>
      <div>{children}</div>
      {action}
    </div>
  )
}

export function SettingsStatList({ items }) {
  return (
    <dl className="space-y-2 text-xs text-neutral-500">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-2">
          <dt>{item.label}</dt>
          <dd className="text-neutral-900 tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SettingsTable({ columns, rows, emptyMessage = 'Nothing to list.' }) {
  if (!rows?.length) {
    return <p className="text-sm text-neutral-500 text-center py-12">{emptyMessage}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn('font-medium px-4 py-2.5', col.align === 'right' && 'text-right')}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-neutral-100 last:border-0">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-2.5',
                    col.align === 'right' && 'text-right',
                    col.muted ? 'text-neutral-500' : 'text-neutral-900',
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
  const text = saving ? 'Saving…' : saved ? 'Saved' : idle
  return <p className="text-[11px] text-neutral-500">{text}</p>
}
