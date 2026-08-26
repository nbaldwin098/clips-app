import { useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import { getCreatorUnreleased, publishDraftItem, deleteCatalogItem } from '../lib/contentService'
import { listDrafts, deleteDraft, listScheduled } from '../lib/youtubeParity'
import { formatPostedAt } from '../lib/mediaMeta'
import { useContentSyncTick } from '../lib/useContentSync'

export default function StudioToolsPage({ onNavigate }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const [tick, setTick] = useState(0)
  const catalog = useMemo(() => getCreatorUnreleased(user?.id, user?.handle), [user?.id, user?.handle, tick, syncTick])
  const drafts = useMemo(() => (user?.id ? listDrafts(user.id) : []), [user?.id, tick])
  const scheduled = useMemo(() => (user?.id ? listScheduled(user.id) : []), [user?.id, tick])

  const publish = async (id) => {
    await publishDraftItem(id, user)
    setTick((n) => n + 1)
  }

  const remove = async (id) => {
    await deleteCatalogItem(id, user, { intentional: true })
    setTick((n) => n + 1)
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-5">
      <PageHeader title="Studio tools" onBack={() => onNavigate?.('dashboard')} />
      <p className="text-xs text-zinc-500">
        Drafts and scheduled posts. Scheduled items go live when the time hits.
      </p>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
        <h2 className="text-sm font-medium text-white">Unpublished catalog</h2>
        {catalog.length === 0 ? (
          <p className="text-xs text-zinc-500">No drafts or scheduled uploads in the catalog.</p>
        ) : catalog.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <div className="min-w-0">
              <p className="text-zinc-200 truncate">{item.title}</p>
              <p>{item.status}{item.scheduledFor ? ` · ${formatPostedAt(item.scheduledFor)}` : ''}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={() => publish(item.id)} className="h-8 px-2 rounded-lg bg-white text-black font-bold">Publish</button>
              <button type="button" onClick={() => remove(item.id)} className="h-8 px-2 rounded-lg border border-zinc-700">Delete</button>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
        <h2 className="text-sm font-medium text-white">Form drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-xs text-zinc-500">No saved upload forms.</p>
        ) : drafts.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <p className="text-zinc-200 truncate">{d.title || 'Untitled draft'}</p>
            <button type="button" onClick={() => { deleteDraft(d.id); setTick((n) => n + 1) }} className="h-8 px-2 rounded-lg border border-zinc-700">Delete</button>
          </div>
        ))}
      </section>

      {scheduled.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-2">
          <h2 className="text-sm font-medium text-white">Scheduled notes</h2>
          {scheduled.map((s) => (
            <p key={s.id} className="text-xs text-zinc-400">{s.title || s.id}</p>
          ))}
        </section>
      )}

      <div className="flex flex-col gap-2 text-sm">
        <button type="button" onClick={() => onNavigate?.('analytics')} className="text-white text-left">Analytics →</button>
        <button type="button" onClick={() => onNavigate?.('stream-settings')} className="text-white text-left">Stream settings →</button>
      </div>
    </div>
  )
}
