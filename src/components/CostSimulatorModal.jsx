import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { estimateB2Cost, estimateS3Cost } from '../lib/storage'

export default function CostSimulatorModal({ open, onClose }) {
  const [count, setCount] = useState(10000)

  const b2 = useMemo(() => estimateB2Cost(count), [count])
  const s3 = useMemo(() => estimateS3Cost(count), [count])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Infrastructure cost simulator</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Number of shorts: {count.toLocaleString()}
            </label>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full mt-2 accent-[#2C729B]"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1,000</span>
              <span>100,000</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Backblaze B2</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">${b2.monthlyUsd}</p>
              <p className="text-xs text-slate-500 mt-1">/ month</p>
              <p className="text-xs text-slate-500 mt-2">{b2.totalGb} GB at $0.005/GB</p>
              <p className="text-xs text-emerald-600 mt-1">$0 egress via Cloudflare Alliance</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">AWS S3 (est.)</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">${s3.monthlyUsd}</p>
              <p className="text-xs text-slate-500 mt-1">/ month</p>
              <p className="text-xs text-slate-500 mt-2">{s3.totalGb} GB storage + egress</p>
              <p className="text-xs text-slate-500 mt-1">Higher bandwidth risk</p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 leading-relaxed">
            Zero-storage reference mode stores only metadata (~1.5 KB per short).
            10,000 references incur effectively $0.00 storage cost.
            Switch to Backblaze B2 when you need owned copies of media.
          </div>
        </div>
      </div>
    </div>
  )
}
