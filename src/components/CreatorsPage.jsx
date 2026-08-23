import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet } from '../lib/storage'
import { listIndexedUsers } from '../lib/moderation'
import { loadTaste } from '../lib/algorithmEngine'

export default function CreatorsPage() {
  const { user } = useAuth()
  const ranked = useMemo(() => {
    const users = listIndexedUsers().filter((u) => u.creatorStatus === 'approved' || u.isCreator)
    const clips = [...(lsGet('imports', []) || []), ...(lsGet('user_clips', []) || [])]
    const byCreator = {}
    for (const c of clips) {
      const id = c.creatorId || c.userId
      if (!id) continue
      byCreator[id] = (byCreator[id] || 0) + 1
    }
    const taste = loadTaste(user?.id || 'anon')
    return users
      .map((u) => ({
        ...u,
        clipCount: byCreator[u.id] || 0,
        score: (byCreator[u.id] || 0) * 2 + (taste?.totalInteractions || 0) * 0.01,
      }))
      .sort((a, b) => b.score - a.score)
  }, [user?.id])

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <h1 className="text-lg font-semibold text-white">Creators</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-5">Recommended by the learning algorithm. Empty until creators are approved and post.</p>
      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Users className="h-8 w-8 text-white mx-auto" />
          <p className="mt-4 text-sm text-zinc-200">No creators to recommend yet</p>
          <p className="mt-1.5 text-xs text-zinc-500 max-w-sm mx-auto">When people apply, get approved, and publish clips, they appear here ranked by engagement — not follower count.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { if (typeof window !== 'undefined') window.__clipsOpenProfile?.(c.handle, c.id) }}
              className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3 text-left hover:border-zinc-600"
            >
              <div className="h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
                {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" /> : (c.displayName || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 truncate">{c.displayName}</p>
                <p className="text-xs text-zinc-500">@{c.handle} · {c.clipCount} clips</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
