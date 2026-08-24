import { useState } from 'react'
import { listReports, setReportStatus } from '../../lib/youtubeParity'
import { listIdVerifications, setIdVerificationStatus } from '../../lib/verification'
import { listTrustLog } from '../../lib/trustSafety'

export default function AdminSafety() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  const reports = listReports()
  const ids = listIdVerifications()
  const log = listTrustLog()

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Reports</h2>
        {reports.length === 0 ? <p className="text-xs text-zinc-500">No reports yet.</p> : reports.map((r) => (
          <div key={r.id} className="rounded-xl border border-white/10 p-3 mb-2 flex justify-between gap-3">
            <div>
              <p className="text-xs text-white">{r.reason || r.type || 'Report'} · {r.status}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{r.handle || r.targetId || r.contentId} · {r.createdAt?.slice(0, 16)}</p>
            </div>
            {r.status === 'open' && (
              <div className="flex gap-2">
                <button type="button" className="h-8 px-2 rounded-lg bg-white text-black text-[11px]" onClick={() => { setReportStatus(r.id, 'resolved'); refresh() }}>Resolve</button>
                <button type="button" className="h-8 px-2 rounded-lg border border-white/15 text-[11px] text-white" onClick={() => { setReportStatus(r.id, 'dismissed'); refresh() }}>Dismiss</button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white mb-3">ID checks</h2>
        {ids.length === 0 ? <p className="text-xs text-zinc-500">No ID submissions.</p> : ids.map((row) => (
          <div key={row.id} className="rounded-xl border border-white/10 p-3 mb-2">
            <p className="text-xs text-white">{row.displayName} @{row.handle} · {row.status}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {row.frontThumb ? <img src={row.frontThumb} alt="" className="rounded-lg max-h-40 object-contain bg-black" /> : null}
              {row.backThumb ? <img src={row.backThumb} alt="" className="rounded-lg max-h-40 object-contain bg-black" /> : null}
            </div>
            {row.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button type="button" className="h-8 px-3 rounded-lg bg-white text-black text-[11px]" onClick={() => { setIdVerificationStatus(row.id, 'approved'); refresh() }}>Accept</button>
                <button type="button" className="h-8 px-3 rounded-lg bg-red-600 text-white text-[11px]" onClick={() => { setIdVerificationStatus(row.id, 'denied'); refresh() }}>Deny</button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Action log</h2>
        {log.length === 0 ? <p className="text-xs text-zinc-500">No moderator actions yet.</p> : log.slice(0, 40).map((row) => (
          <p key={row.id} className="text-[11px] text-zinc-400 py-1 border-b border-white/5">
            {row.at?.slice(0, 16)} · {row.action} · {row.userId || row.reason}
          </p>
        ))}
      </section>
    </div>
  )
}
