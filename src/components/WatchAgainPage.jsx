import { useMemo, useState, useEffect } from 'react'
import { RotateCcw, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { listWatchAgain, pullWatchProgressFromCloud, percentLabel } from '../lib/watchProgress'
import { getById, getWatchItem } from '../lib/contentService'
import PageHeader from './PageHeader'
import MediaShelves from './MediaShelves'

export default function WatchAgainPage({ onNavigate, onPlayItem }) {
  const { user, isAuthenticated } = useAuth()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (user?.id) {
      pullWatchProgressFromCloud(user.id).then(() => setTick((t) => t + 1)).catch(() => {})
    }
  }, [user?.id])

  const rows = useMemo(() => (user?.id ? listWatchAgain(user.id) : []), [user?.id, tick])
  const items = useMemo(
    () => rows.map((row) => getWatchItem(row.contentId) || getById(row.contentId) || row).filter((i) => i?.type !== 'pic'),
    [rows, tick],
  )

  const handlePlay = (item) => {
    const full = getWatchItem(item?.id || item?.contentId) || getById(item?.id || item?.contentId) || item
    onPlayItem?.(full)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Watch again" onBack={() => onNavigate?.('home')} />
      <p className="text-xs text-zinc-500 mb-6">
        Videos and clips you finished. Tap Watch again on a player to restart from the beginning.
      </p>

      {!isAuthenticated ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-14 text-center text-sm text-zinc-500">
          Sign in to save what you have finished watching.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <RotateCcw className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">Nothing to watch again yet</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Finish a video or clip and it will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block">
            <MediaShelves items={items} onPlayItem={handlePlay} />
          </div>
          <div className="sm:hidden space-y-2.5">
            {rows.map((row) => {
              const item = getWatchItem(row.contentId) || getById(row.contentId) || row
              if (!item || item.type === 'pic') return null
              const ratio = row.lastRatio ?? row.watchRatio
              return (
                <div
                  key={row.contentId}
                  className="rounded-xl border border-zinc-800/90 bg-[#121218] p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{row.title || item.title || row.contentId}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Watched {percentLabel(ratio)}
                      {row.updatedAt ? ` · ${new Date(row.updatedAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlay(item)}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-xs font-bold shrink-0"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Watch again
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
