import { useEffect, useState } from 'react'
import { Newspaper } from 'lucide-react'
import PageHeader from './PageHeader'
import {
  listNews,
  syncNewsFromCloud,
  subscribeNewsChanged,
  formatNewsWhen,
} from '../lib/siteNews'
import { cn } from '../lib/utils'

export default function NewsPage({ onNavigate }) {
  const [items, setItems] = useState(() => listNews())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    syncNewsFromCloud()
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    const off = subscribeNewsChanged(() => setItems(listNews()))
    return () => {
      cancelled = true
      off()
    }
  }, [])

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <PageHeader
        title="News"
        subtitle="Product updates from calabi — Cash, creators, shop, and more."
        onBack={() => onNavigate?.('home')}
      />

      {loading && items.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading news…</p>
      ) : null}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-zinc-800 bg-[#0c0c10] px-4 py-3.5"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
                <Newspaper className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-sky-400/90">
                    {item.tag}
                  </span>
                  <span className="text-[10px] text-zinc-600">{formatNewsWhen(item.publishedAt)}</span>
                </div>
                <h2 className="mt-1 text-sm font-semibold text-white">{item.title}</h2>
                <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{item.body}</p>
                {item.destView && item.ctaLabel ? (
                  <button
                    type="button"
                    onClick={() => onNavigate?.(item.destView, item.destId || undefined)}
                    className={cn(
                      'mt-3 h-8 px-3 rounded-lg border border-zinc-700 text-xs font-semibold text-white',
                      'hover:bg-zinc-800 transition-colors',
                    )}
                  >
                    {item.ctaLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!loading && items.length === 0 ? (
        <p className="text-sm text-zinc-500">No news yet. Check back soon.</p>
      ) : null}
    </div>
  )
}
