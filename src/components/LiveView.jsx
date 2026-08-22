import { Radio } from 'lucide-react'

export default function LiveView() {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Live broadcasts</h1>
      <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-20 text-center shadow-sm">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#EBF4FA] flex items-center justify-center">
          <Radio className="h-7 w-7 text-[#2C729B]" />
        </div>
        <p className="mt-5 text-sm font-medium text-slate-800">No live streams</p>
        <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Live rooms appear only when authenticated creators start a broadcast with a valid stream key.
        </p>
      </div>
    </div>
  )
}
