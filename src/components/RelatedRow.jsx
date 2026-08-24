import PostedStamp from './PostedStamp'
import { creatorDisplayName, formatDuration, isOfficialCreator, viewsLabel } from '../lib/uiFormat'
import { getViews } from '../lib/engagement'
import VerifiedBadge from './VerifiedBadge'

export default function RelatedRow({ item, onOpen }) {
  if (!item) return null
  const thumb = item.thumbUrl || item.mediaUrl
  const views = getViews(item.id)
  const name = creatorDisplayName(item)
  const official = isOfficialCreator(item.creatorId || item.userId, item.handle)
  const vertical = item.type === 'short' || item.type === 'pic'

  return (
    <button type="button" onClick={() => onOpen?.(item)} className="w-full flex gap-2 text-left group">
      <div className={`relative shrink-0 overflow-hidden rounded-lg bg-[#272727] ${vertical ? 'w-[90px] aspect-[9/16]' : 'w-[168px] aspect-video'}`}>
        {thumb ? (
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" loading="lazy" referrerPolicy="no-referrer" />
        ) : null}
        {item.durationSec > 0 && (
          <span className="absolute bottom-1 right-1 rounded px-1 py-px text-[10px] font-medium text-white bg-black/80">
            {formatDuration(item.durationSec)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-zinc-100 leading-snug line-clamp-2">{item.title || 'Untitled'}</p>
        <p className="mt-1 text-xs text-[#aaa] inline-flex items-center gap-1 min-w-0">
          <span className="truncate">{name}</span>
          {official ? <VerifiedBadge /> : null}
        </p>
        <p className="text-xs text-[#aaa]">
          {viewsLabel(views)}
          {item.createdAt || item.publishedAt ? <> · <PostedStamp item={item} /></> : null}
        </p>
      </div>
    </button>
  )
}
