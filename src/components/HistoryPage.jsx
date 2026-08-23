import { useMemo, useState, useEffect } from 'react'
import { History, Trash2, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  listWatchHistoryDetailed,
  clearWatchProgress,
  percentLabel,
  pullWatchProgressFromCloud,
} from '../lib/watchProgress'
import { getById } from '../lib/contentService'
import PageHeader from './PageHeader'

export default function HistoryPage({ onNavigate, onPlayItem }) {
  const { user, isAuthenticated } = useAuth()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (user?.id) {
      pullWatchProgressFromCloud(user.id).then(() => setTick((t) => t + 1)).catch(() => {})
    }
  }, [user?.id])

  const historyItems = useMemo(() => (user?.id ? listWatchHistoryDetailed(user.id) : []), [user?.id, tick])

  const handleClear = () => {
    if (!user?.id) return
    clearWatchProgress(user.id)
    setTick((t) => t + 1)
  }

  const handlePlay = (item) => {
    const full = getById(item.contentId) || item
    if (onPlayItem) {
      onPlayItem(full)
    } else if (full.sourceUrl) {
      window.open(full.sourceUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="History"
        onBack={() => onNavigate?.('home')}
        actions={
          historyItems.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-800 bg-[#14141c] text-xs text-zinc-300 hover:text-red-400 hover:border-red-500/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear history
            </button>
          )
        }
      />

      {!isAuthenticated ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-14 text-center text-sm text-zinc-500">
          Sign in to save watch history and resume seamlessly across devices.
        </div>
      ) : historyItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <History className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">No watch history yet</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Videos and clips you watch will appear here with your exact progress.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {historyItems.map((item) => {
            const ratio = item.lastRatio ?? item.watchRatio
            return (
              <div
                key={item.contentId || item.id}
                className="rounded-xl border border-zinc-800/90 bg-[#121218] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{item.title || item.contentId}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    {item.handle && <span className="text-zinc-400">@{item.handle}</span>}
                    {ratio != null && <span className="text-white font-medium">Watched {percentLabel(ratio)}</span>}
                    {item.updatedAt && <span>· {new Date(item.updatedAt).toLocaleDateString()}</span>}
                    {item.completed && <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-300">Completed</span>}
                  </div>
                  {ratio != null && ratio > 0 && (
                    <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden max-w-xs">
                      <div className="h-full bg-white rounded-full" style={{ width: `${Math.round(ratio * 100)}%` }} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handlePlay(item)}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all shrink-0"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> {item.completed ? 'Watch again' : 'Resume'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
