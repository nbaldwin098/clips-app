import { useMemo, useState, useEffect } from 'react'
import { Film, Heart, Clock, History, Upload, Play } from 'lucide-react'
import { getLiked, getSaved, getImports } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import {
  listWatchHistoryDetailed,
  listContinueWatching,
  percentLabel,
  pullWatchProgressFromCloud,
} from '../lib/watchProgress'
import { getById } from '../lib/contentService'
import { subscribeContentUpdates } from '../lib/contentSync'

const TABS = [
  { id: 'continue', label: 'Continue', icon: Play },
  { id: 'history', label: 'History', icon: History },
  { id: 'liked', label: 'Liked', icon: Heart },
  { id: 'saved', label: 'Saved', icon: Clock },
  { id: 'imports', label: 'Imports', icon: Upload },
]

export default function LibraryPage({ initialTab = 'history' }) {
  const { user, isAuthenticated } = useAuth()
  const [tab, setTab] = useState(initialTab === 'history' ? 'continue' : initialTab)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (user?.id) {
      pullWatchProgressFromCloud(user.id).then(() => setTick((t) => t + 1)).catch(() => {})
    }
  }, [user?.id])

  useEffect(() => subscribeContentUpdates(() => setTick((t) => t + 1)), [])

  const continueItems = useMemo(() => (user?.id ? listContinueWatching(user.id) : []), [user?.id, tick])
  const historyItems = useMemo(() => (user?.id ? listWatchHistoryDetailed(user.id) : []), [user?.id, tick])

  const items = useMemo(() => {
    if (tab === 'continue') return continueItems
    if (tab === 'history') return historyItems
    if (tab === 'liked') {
      return getLiked().map((id) => {
        const c = getById(id)
        return { contentId: id, title: c?.title || id, sourceUrl: c?.sourceUrl, watchRatio: null }
      })
    }
    if (tab === 'saved') {
      return getSaved().map((id) => {
        const c = getById(id)
        return { contentId: id, title: c?.title || id, sourceUrl: c?.sourceUrl, watchRatio: null }
      })
    }
    if (tab === 'imports') {
      return getImports().map((i) => ({
        contentId: i.id, title: i.title, sourceUrl: i.sourceUrl, watchRatio: null,
      }))
    }
    return []
  }, [tab, continueItems, historyItems, tick])

  const openLink = (row) => {
    const url = row.sourceUrl || getById(row.contentId)?.sourceUrl
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-100 mb-1">Library</h1>
      <p className="text-xs text-zinc-500 mb-4">
        Catch up on another device when shared login is on. Clips stay as links — we only store how far you watched.
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium border transition-colors ${
              active ? 'bg-white text-black border-white' : 'bg-[#121218] text-zinc-400 border-zinc-800 hover:bg-[#0b0b0f]'
            }`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          )
        })}
      </div>

      {!isAuthenticated && (tab === 'continue' || tab === 'history') ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-12 text-center text-sm text-zinc-500">
          Sign in to save watch progress and continue on another device.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-[#121218] px-6 py-16 text-center shadow-sm">
          <Film className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-4 text-sm font-medium text-zinc-300">Nothing here yet</p>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            {tab === 'continue' ? 'Videos you start show here so you can catch up.' : 'Watch, like, or save to fill this list.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const ratio = item.lastRatio ?? item.watchRatio
            return (
              <li key={item.contentId || item.id} className="rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-100 truncate">{item.title || item.contentId}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    {ratio != null && <span className="text-white font-medium">Watched {percentLabel(ratio)}</span>}
                    {item.updatedAt && <span>{new Date(item.updatedAt).toLocaleString()}</span>}
                    {item.completed && <span className="text-zinc-600">Finished</span>}
                  </div>
                  {ratio != null && ratio > 0 && (
                    <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden max-w-xs">
                      <div className="h-full bg-white rounded-full" style={{ width: `${Math.round(ratio * 100)}%` }} />
                    </div>
                  )}
                </div>
                {(item.sourceUrl || getById(item.contentId)?.sourceUrl) && (
                  <button type="button" onClick={() => openLink(item)} className="h-9 px-3 rounded-lg bg-white text-black text-xs shrink-0">
                    {tab === 'continue' ? 'Resume' : 'Open'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
