import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ title, onBack, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button type="button" onClick={onBack} className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-zinc-800 text-white hover:bg-zinc-800" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
