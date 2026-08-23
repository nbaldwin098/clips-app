import { formatAttribution } from '../lib/license'
import { safeHttpUrl } from '../lib/safeUrl'

export default function AttributionBadge({ item, className = '' }) {
  if (!item?.license && !item?.attribution) return null
  const text = formatAttribution(item)
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 ${className}`}
    >
      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
        {item.license || 'Licensed'}
      </span>
      {item.attribution && <span className="leading-snug">{item.attribution}</span>}
      {safeHttpUrl(item.sourceUrl) && (
        <a
          href={safeHttpUrl(item.sourceUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Source
        </a>
      )}
      {!text && null}
    </div>
  )
}
