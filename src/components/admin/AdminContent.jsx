import { useMemo, useState } from 'react'
import { adminRemoveContent, listAllContent } from '../../lib/trustSafety'

export default function AdminContent() {
  const [q, setQ] = useState('')
  const [tick, setTick] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const rows = useMemo(() => {
    const all = listAllContent()
    const s = q.trim().toLowerCase()
    if (!s) return all
    return all.filter((r) => `${r.title} ${r.handle} ${r.id}`.toLowerCase().includes(s))
  }, [q, tick])

  const remove = async (id) => {
    if (!id || busyId) return
    if (!window.confirm('Delete this post from the site?')) return
    setBusyId(id)
    try {
      await adminRemoveContent(id)
    } finally {
      setBusyId(null)
      setTick((n) => n + 1)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 py-4 border-b border-white/10">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search posts…"
          className="h-10 w-full max-w-md rounded-lg border border-white/10 bg-black px-3 text-sm text-white placeholder:text-zinc-600"
        />
      </div>
      <div className="overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#0b0b0d] text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Title</th>
              <th className="px-3 py-2.5 font-medium">Creator</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="px-5 py-2.5 text-white max-w-[360px] truncate">{r.title || 'Untitled'}</td>
                <td className="px-3 py-2.5 text-zinc-400">@{r.handle || '—'}</td>
                <td className="px-3 py-2.5 text-zinc-500">{r.type || 'video'}</td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    className="h-7 px-2 rounded-md border border-red-500/30 text-[11px] text-red-300 disabled:opacity-50"
                    onClick={() => remove(r.id)}
                  >
                    {busyId === r.id ? '…' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 py-10 text-sm text-zinc-500">No posts.</p>}
      </div>
    </div>
  )
}
