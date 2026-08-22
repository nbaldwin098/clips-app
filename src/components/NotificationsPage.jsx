import { Bell } from 'lucide-react'
import { lsGet } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { getLiveChat } from '../lib/engagement'

export default function NotificationsPage() {
  const { user } = useAuth()
  const reports = lsGet('yt_reports', []).slice(0, 10)
  const board = lsGet('live_board', []).filter((b) => b.isLive).slice(0, 5)
  const items = []
  for (const b of board) {
    items.push({ id: b.id || b.userId, text: `@${b.handle || 'creator'} is live: ${b.title || 'Untitled'}`, at: b.startedAt })
  }
  for (const r of reports) {
    if (user && r.reporterId === user.id) {
      items.push({ id: r.id, text: `Your report (${r.reason}) was submitted`, at: r.at })
    }
  }
  if (user?.handle) {
    for (const m of (getLiveChat(user.id) || []).slice(-5)) {
      items.push({ id: m.id, text: `Chat: ${m.name}: ${m.text}`, at: m.at })
    }
  }
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-100 mb-6">Notifications</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-[#121218] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-[rgba(0,122,204,0.15)] flex items-center justify-center">
            <Bell className="h-6 w-6 text-[#007ACC]" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">You are all caught up</p>
          <p className="mt-1.5 text-xs text-zinc-500">Live starts and reports show here until Supabase realtime is connected.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3">
              <p className="text-sm text-zinc-200">{it.text}</p>
              {it.at && <p className="text-[10px] text-zinc-600 mt-1">{new Date(it.at).toLocaleString()}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
