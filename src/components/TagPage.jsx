import { useMemo } from 'react'
import { getByTag, listCatalogTags } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import MediaShelves from './MediaShelves'
import PageHeader from './PageHeader'

export default function TagPage({ tag, onNavigate, onPlayItem, onOpenPic, onOpenTag }) {
  const syncTick = useContentSyncTick()
  const label = String(tag || '').replace(/^#/, '')
  const items = useMemo(() => getByTag(label), [label, syncTick])
  const related = useMemo(
    () => listCatalogTags(12).filter((t) => t.tag !== label.toLowerCase()).slice(0, 8),
    [label, syncTick],
  )

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-5">
      <PageHeader title={`#${label}`} onBack={() => onNavigate?.('explore')} />
      <p className="text-xs text-zinc-500 -mt-3">
        {items.length} {items.length === 1 ? 'post' : 'posts'} tagged #{label}
      </p>

      {related.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-zinc-500 self-center mr-1">More hashtags</span>
          {related.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => onOpenTag?.(t.tag)}
              className="h-7 px-2.5 border border-zinc-800 bg-zinc-900 text-[11px] text-zinc-300 hover:border-white hover:text-white"
            >
              #{t.tag}
            </button>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-16">
          No videos, clips, or pics with #{label} yet. Add hashtags when you upload.
        </p>
      ) : (
        <MediaShelves items={items} onPlayItem={onPlayItem} onOpenPic={onOpenPic} />
      )}
    </div>
  )
}
