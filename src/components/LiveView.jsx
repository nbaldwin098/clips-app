import { Radio } from 'lucide-react'

export default function LiveView() {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Live broadcasts</h1>
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-20 text-center">
        <Radio className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-4 text-sm font-medium text-slate-700">No live streams</p>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Live rooms appear only when authenticated creators start a broadcast with a valid stream key.
        </p>
      </div>
    </div>
  )
}
