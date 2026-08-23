import { useMemo } from 'react'
import { getByTag } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import MediaShelves from './MediaShelves'
import PageHeader from './PageHeader'

export default function TagPage({ tag, onNavigate, onPlayItem }) {
  const syncTick = useContentSyncTick()
  const label = String(tag || '').replace(/^#/, '')
  const items = useMemo(() => getByTag(label), [label, syncTick])

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <PageHeader title={`#${label}`} onBack={() => onNavigate?.('explore')} />
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-16">No videos, clips, or pics with this tag.</p>
      ) : (
        <MediaShelves items={items} onPlayItem={onPlayItem} />
      )}
    </div>
  )
}
