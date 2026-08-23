import ContentCard from './ContentCard'

/**
 * Horizontal-scrolling shelf for 9:16 clips — never mixed into the same
 * multi-column grid as 16:9 videos. Each tile has a fixed width so the
 * action row never has to reflow/wrap as the viewport resizes.
 */
export default function ClipsShelf({ items, onOpen, title, emptyText, renderOverlay }) {
  if (!items?.length) {
    if (!emptyText) return null
    return (
      <section>
        {title && <h2 className="text-base font-semibold text-zinc-200 mb-3">{title}</h2>}
        <p className="text-sm text-zinc-500 text-center py-10 rounded-2xl border border-zinc-800 bg-[#121218]">{emptyText}</p>
      </section>
    )
  }
  return (
    <section>
      {title && <h2 className="text-base font-semibold text-zinc-200 mb-3">{title}</h2>}
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory -mx-1 px-1">
        {items.map((item) => (
          <div key={item.id} className="w-[150px] sm:w-[180px] shrink-0 snap-start relative">
            {renderOverlay ? renderOverlay(item) : null}
            <ContentCard item={item} onOpen={onOpen} variant="short" />
          </div>
        ))}
      </div>
    </section>
  )
}
