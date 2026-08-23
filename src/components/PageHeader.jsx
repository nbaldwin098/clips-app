import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ title, onBack, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {onBack && (
        <button type="button" onClick={onBack} className="h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-800 text-white hover:bg-zinc-800" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
