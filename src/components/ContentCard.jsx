import { ExternalLink } from 'lucide-react'
import { formatCount } from '../data/content'
import { recordView } from '../lib/contentService'

export default function ContentCard({ item, onOpen }) {
  if (!item) return null

  const open = () => {
    recordView(item.id)
    if (onOpen) onOpen(item)
    else if (item.sourceUrl) window.open(item.sourceUrl, '_blank', 'noopener,noreferrer')
  }

  const thumb = item.thumbUrl || item.mediaUrl

  return (
    <button
      type="button"
      onClick={open}
      className="group text-left rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:border-[#2C729B]/35 hover:shadow-md transition-all card-lift w-full"
    >
      <div className="aspect-[9/14] max-h-64 bg-slate-100 relative overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
            No preview
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-[#2C729B]">
          {item.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
          <span>{formatCount(item.views)} views</span>
          <span className="inline-flex items-center gap-1 text-[#2C729B]">
            Open <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  )
}
