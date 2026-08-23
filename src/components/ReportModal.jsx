import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet, lsSet } from '../lib/storage'
import { notifyReport } from '../lib/notifications'
const REASONS = ['Spam or misleading','Harassment or hate','Sexual content','Violent or dangerous','Copyright infringement','Child safety','Other']
export default function ReportModal({ open, onClose, target = {} }) {
  const { user, isAuthenticated } = useAuth()
  const [reason, setReason] = useState(REASONS[0])
  const [detail, setDetail] = useState('')
  const [done, setDone] = useState(false)
  if (!open) return null
  const submit = (e) => {
    e.preventDefault()
    const list = lsGet('yt_reports', [])
    list.unshift({ id: `rep_${Date.now()}`, reason, detail: detail.slice(0, 500), target, reporterId: user?.id || 'anon', at: new Date().toISOString() })
    lsSet('yt_reports', list.slice(0, 200))
    notifyReport({
      reporterId: user?.id || null,
      targetUserId: target.userId || target.creatorId || null,
      reason,
      contentId: target.contentId || target.id || null,
    })
    setDone(true)
  }
  const block = () => {
    if (!isAuthenticated || !target.userId) return
    const blocks = lsGet('yt_blocks', {})
    const mine = blocks[user.id] || []
    if (!mine.includes(target.userId)) mine.push(target.userId)
    blocks[user.id] = mine
    lsSet('yt_blocks', blocks)
    onClose?.()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121218] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Report</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-800"><X className="h-4 w-4" /></button>
        </div>
        {done ? (
          <p className="text-sm text-zinc-200">Report submitted.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs text-white">Reason
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm">{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <label className="block text-xs text-white">Details
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} maxLength={500} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="w-full h-10 rounded-lg bg-white text-black text-sm">Submit report</button>
            {target.userId && isAuthenticated && (
              <button type="button" onClick={block} className="w-full h-9 rounded-lg border border-zinc-700 text-xs text-zinc-300">Block this user</button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
