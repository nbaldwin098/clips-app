import { Radio, Settings } from 'lucide-react'

export default function LiveView({ onNavigate }) {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Live broadcasts</h1>
      <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#EBF4FA] flex items-center justify-center">
          <Radio className="h-7 w-7 text-[#2C729B]" />
        </div>
        <p className="mt-5 text-sm font-medium text-slate-800">No live streams right now</p>
        <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          When creators go live with a valid stream key, rooms appear here with real viewer counts.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('settings')}
          className="mt-6 inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Settings className="h-4 w-4" />
          Stream settings
        </button>
      </div>
    </div>
  )
}
