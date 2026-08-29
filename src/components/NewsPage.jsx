import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  listNewspaper,
  publishNewspaperPost,
  deleteNewspaperPost,
  subscribeNewspaper,
  splitParagraphs,
} from '../lib/newspaper'
import { cn } from '../lib/utils'

/**
 * Broadsheet column: paragraphs + photos only (no headlines).
 */
function PaperColumn({ story, canDelete, onDelete }) {
  const paragraphs = useMemo(() => splitParagraphs(story.body), [story.body])
  const media = story.media || []

  const blocks = []
  const max = Math.max(paragraphs.length, media.length, 1)
  for (let i = 0; i < max; i += 1) {
    if (paragraphs[i]) blocks.push({ kind: 'p', text: paragraphs[i], key: `p${i}` })
    if (media[i]) blocks.push({ kind: 'm', media: media[i], key: `m${i}` })
  }

  if (!blocks.length) return null

  return (
    <article className="break-inside-avoid mb-5 pb-5 border-b border-neutral-800/80 last:border-0 last:mb-0 last:pb-0">
      <div className="space-y-3">
        {blocks.map((b) => {
          if (b.kind === 'p') {
            return (
              <p
                key={b.key}
                className="font-[family-name:var(--font-paper)] text-[13px] sm:text-[14px] leading-[1.45] text-neutral-200 text-justify hyphens-auto"
              >
                {b.text}
              </p>
            )
          }
          const m = b.media
          if (m.type === 'video' || m.type === 'gif') {
            return (
              <figure key={b.key} className="my-2">
                <video
                  src={m.url}
                  controls={m.type === 'video'}
                  autoPlay={m.type === 'gif'}
                  muted={m.type === 'gif'}
                  loop={m.type === 'gif'}
                  playsInline
                  className="w-full max-h-[360px] object-cover bg-black border border-neutral-800"
                />
                {m.alt ? (
                  <figcaption className="mt-1 text-[11px] text-neutral-500 font-[family-name:var(--font-paper)] italic leading-snug">
                    {m.alt}
                  </figcaption>
                ) : null}
              </figure>
            )
          }
          return (
            <figure key={b.key} className="my-2">
              <img
                src={m.url}
                alt={m.alt || ''}
                className="w-full max-h-[420px] object-cover bg-neutral-900 border border-neutral-800"
              />
              {m.alt ? (
                <figcaption className="mt-1 text-[11px] text-neutral-500 font-[family-name:var(--font-paper)] italic leading-snug">
                  {m.alt}
                </figcaption>
              ) : null}
            </figure>
          )
        })}
      </div>
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="mt-3 text-[10px] uppercase tracking-wider text-neutral-600 hover:text-neutral-400"
        >
          Remove
        </button>
      ) : null}
    </article>
  )
}

/**
 * Compose lives in Calabi Studio — export for studio News tab.
 */
export function ComposePaper({ onPublished, onOpenAuth, compact = false }) {
  const { user, isAuthenticated } = useAuth()
  const fileRef = useRef(null)
  const [body, setBody] = useState('')
  const [media, setMedia] = useState([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    const next = []
    for (const file of files.slice(0, 4)) {
      const url = URL.createObjectURL(file)
      const isVid = String(file.type).startsWith('video/')
      const isGif = String(file.type) === 'image/gif' || /\.gif$/i.test(file.name)
      next.push({
        type: isVid ? 'video' : isGif ? 'gif' : 'image',
        url,
        alt: file.name,
        _objectUrl: true,
      })
    }
    setMedia((m) => [...m, ...next].slice(0, 8))
  }

  const publish = async () => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    setBusy(true)
    setNote('')
    const res = publishNewspaperPost({ body, media, user })
    setBusy(false)
    if (!res.ok) {
      setNote(res.error || 'Could not publish.')
      return
    }
    setBody('')
    setMedia([])
    onPublished?.()
  }

  return (
    <div className={cn('border border-zinc-800 bg-[#0e0e14] p-4', compact ? '' : 'sm:p-5')}>
      <p className="text-sm font-semibold text-white mb-1">Publish to News</p>
      <p className="text-xs text-zinc-500 mb-3">
        Paragraphs and photos only — they land on the News tab as a paper layout. No headlines.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="Write paragraphs. Separate with a blank line. Add photos below."
        className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-zinc-200 font-[family-name:var(--font-paper)] leading-relaxed resize-y"
      />
      <input ref={fileRef} type="file" accept="image/*,video/*,.gif" multiple className="hidden" onChange={onFiles} />
      <div className="mt-3 flex flex-wrap gap-2">
        {media.map((m, i) => (
          <div key={`${m.url}_${i}`} className="relative h-16 w-16 overflow-hidden bg-zinc-900 border border-zinc-800">
            {m.type === 'video' || m.type === 'gif' ? (
              <video src={m.url} className="h-full w-full object-cover" muted />
            ) : (
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              className="absolute inset-0 bg-black/50 text-[10px] text-white opacity-0 hover:opacity-100"
              onClick={() => setMedia((rows) => rows.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-9 px-3 border border-zinc-700 text-xs text-zinc-300 hover:border-white hover:text-white"
        >
          Add photo / video
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={publish}
          className="h-9 px-4 bg-white text-black text-xs font-semibold disabled:opacity-50"
        >
          {busy ? 'Publishing…' : 'Publish to News'}
        </button>
      </div>
      {note ? <p className="mt-2 text-xs text-amber-400">{note}</p> : null}
    </div>
  )
}

/**
 * News tab: broadsheet under the app header — paragraphs + photos only.
 * Upload happens in Calabi Studio → News.
 */
export default function NewsPage({ onNavigate, onOpenAuth }) {
  const { user } = useAuth()
  const [items, setItems] = useState(() => listNewspaper())

  useEffect(() => {
    const off = subscribeNewspaper(() => setItems(listNewspaper()))
    return off
  }, [])

  return (
    <div
      className="min-h-full bg-black"
      style={{ '--font-paper': '"Libre Baskerville", "Source Serif 4", Georgia, "Times New Roman", serif' }}
    >
      <div className="p-3">
        {items.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="font-[family-name:var(--font-paper)] text-sm text-neutral-500">
              No stories yet.
            </p>
            <p className="text-xs text-neutral-600 max-w-sm mx-auto">
              Publish paragraphs and photos from Calabi Studio → News.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.('dashboard', 'lab')}
              className="h-9 px-4 border border-neutral-700 text-xs text-neutral-300 hover:border-white hover:text-white"
            >
              Open Calabi Studio
            </button>
            {!user?.id ? (
              <button
                type="button"
                onClick={() => onOpenAuth?.()}
                className="block mx-auto text-[11px] text-neutral-600 underline"
              >
                Sign in
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              'columns-1 sm:columns-2 lg:columns-3 xl:columns-4',
              'gap-x-6 lg:gap-x-8',
              '[column-rule:1px_solid_rgba(82,82,82,0.45)]'
            )}
          >
            {items.map((story) => (
              <PaperColumn
                key={story.id}
                story={story}
                canDelete={Boolean(user?.id && story.authorId === user.id)}
                onDelete={() => {
                  deleteNewspaperPost(story.id, user.id)
                  setItems(listNewspaper())
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
