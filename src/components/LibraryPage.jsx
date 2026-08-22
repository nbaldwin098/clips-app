import { useMemo, useState, useEffect } from 'react'
import { Film, Heart, Clock, History, Upload } from 'lucide-react'
import { getHistory, getLiked, getSaved, getImports } from '../lib/storage'

const TABS = [
  { id: 'history', label: 'History', icon: History },
  { id: 'liked', label: 'Liked', icon: Heart },
  { id: 'saved', label: 'Saved', icon: Clock },
  { id: 'imports', label: 'Imports', icon: Upload },
]

export default function LibraryPage({ initialTab = 'history' }) {
  const [tab, setTab] = useState(initialTab)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setTick((t) => t + 1)
  }, [tab])

  const items = useMemo(() => {
    if (tab === 'history') return getHistory()
    if (tab === 'liked') return getLiked().map((id) => ({ id, title: id }))
    if (tab === 'saved') return getSaved().map((id) => ({ id, title: id }))
    if (tab === 'imports') return getImports()
    return []
  }, [tab, tick])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Library</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium border transition-colors ${
                active
                  ? 'bg-[#2C729B] text-white border-[#2C729B]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
          <Film className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">Nothing here yet</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {tab === 'imports'
              ? 'Imported zero-storage references will appear here.'
              : 'Activity is recorded only from real interactions on this device.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {item.title || item.id}
                </p>
                {item.platform && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.platform}
                    {item.crossPost?.isCrossPost ? ' · cross-post' : ''}
                  </p>
                )}
                {item.sourceUrl && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.sourceUrl}</p>
                )}
              </div>
              {item.createdAt && (
                <span className="text-xs text-slate-400 shrink-0">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
