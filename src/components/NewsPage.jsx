import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  listNewspaper,
  publishNewspaperPost,
  deleteNewspaperPost,
  subscribeNewspaper,
  splitParagraphs,
  formatPaperWhen,
} from '../lib/newspaper'
import { cn } from '../lib/utils'

/**
 * Interleave paragraphs and media like a newspaper column.
 */
function NewspaperStory({ story, canDelete, onDelete }) {
  const paragraphs = useMemo(() => splitParagraphs(story.body), [story.body])
  const media = story.media || []

  const blocks = []
  const max = Math.max(paragraphs.length, media.length)
  for (let i = 0; i < max; i += 1) {
    if (paragraphs[i]) blocks.push({ kind: 'p', text: paragraphs[i], key: `p${i}` })
    if (media[i]) blocks.push({ kind: 'm', media: media[i], key: `m${i}` })
  }
  // If only media, already covered; if leftover media after paragraphs loop handled by max

  const hed = paragraphs[0]?.slice(0, 96) || (media[0] ? 'Photo story' : 'Dispatch')

  return (
    <article className="border-b border-stone-800/80 pb-10 mb-10 last:border-0">
      <header className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
          {formatPaperWhen(story.publishedAt)}
          {story.handle ? ` · @${story.handle}` : ''}
        </p>
        <h2 className="mt-2 font-serif text-2xl sm:text-3xl text-stone-100 leading-tight tracking-tight">
          {hed}
        </h2>
      </header>

      <div className="space-y-5">
        {blocks.map((b, idx) => {
          if (b.kind === 'p') {
            // Skip first paragraph if used as hed and there is more body
            if (idx === 0 && paragraphs.length > 1 && b.text === paragraphs[0]) {
              return (
                <p key={b.key} className="font-serif text-[15px] sm:text-base text-stone-300 leading-7 first-letter:text-3xl first-letter:font-semibold first-letter:mr-1 first-letter:float-left first-letter:text-stone-100">
                  {b.text}
                </p>
              )
            }
            if (idx === 0 && paragraphs.length === 1 && !media.length) {
              return (
                <p key={b.key} className="font-serif text-[15px] sm:text-base text-stone-300 leading-7">
                  {b.text}
                </p>
              )
            }
            if (b.text === paragraphs[0] && paragraphs.length > 1) {
              return (
                <p key={b.key} className="font-serif text-[15px] sm:text-base text-stone-300 leading-7 first-letter:text-3xl first-letter:font-semibold first-letter:mr-1 first-letter:float-left first-letter:text-stone-100">
                  {b.text}
                </p>
              )
            }
            return (
              <p key={b.key} className="font-serif text-[15px] sm:text-base text-stone-300 leading-7">
                {b.text}
              </p>
            )
          }
          const m = b.media
          if (m.type === 'video' || m.type === 'gif') {
            return (
              <figure key={b.key} className="my-2">
                <video src={m.url} controls={m.type === 'video'} autoPlay={m.type === 'gif'} muted={m.type === 'gif'} loop={m.type === 'gif'} playsInline className="w-full max-h-[420px] object-cover bg-black" />
                {m.alt ? <figcaption className="mt-1.5 text-[11px] text-stone-500 font-serif italic">{m.alt}</figcaption> : null}
              </figure>
            )
          }
          return (
            <figure key={b.key} className="my-2">
              <img src={m.url} alt={m.alt || ''} className="w-full max-h-[480px] object-cover bg-stone-900" />
              {m.alt ? <figcaption className="mt-1.5 text-[11px] text-stone-500 font-serif italic">{m.alt}</figcaption> : null}
            </figure>
          )
        })}
      </div>

      {canDelete ? (
        <button type="button" onClick={onDelete} className="mt-4 text-[11px] text-stone-600 underline hover:text-stone-400">
          Remove story
        </button>
      ) : null}
    </article>
  )
}

function ComposePaper({ onPublished, onOpenAuth }) {
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
    <div className="mb-10 border border-stone-800 bg-[#0e0e0c] p-4 sm:p-5">
      <p className="font-serif text-sm text-stone-300 mb-2">Contribute a story</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Write in paragraphs. Separate paragraphs with a blank line. Add photos or video below."
        className="w-full bg-black border border-stone-800 px-3 py-2 text-sm text-stone-200 font-serif leading-relaxed resize-y"
      />
      <input ref={fileRef} type="file" accept="image/*,video/*,.gif" multiple className="hidden" onChange={onFiles} />
      <div className="mt-3 flex flex-wrap gap-2">
        {media.map((m, i) => (
          <div key={`${m.url}_${i}`} className="relative h-16 w-16 overflow-hidden bg-stone-900 border border-stone-800">
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
          className="h-9 px-3 border border-stone-700 text-xs text-stone-300"
        >
          Add photo / video / gif
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={publish}
          className="h-9 px-4 bg-stone-100 text-black text-xs font-semibold disabled:opacity-50"
        >
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      </div>
      {note ? <p className="mt-2 text-xs text-amber-400">{note}</p> : null}
    </div>
  )
}

/**
 * News = user newspaper: paragraphs + photos (and video/gif), not product changelog cards.
 */
export default function NewsPage({ onNavigate, onOpenAuth }) {
  const { user } = useAuth()
  const [items, setItems] = useState(() => listNewspaper())

  useEffect(() => {
    const off = subscribeNewspaper(() => setItems(listNewspaper()))
    return off
  }, [])

  const edition = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }, [])

  return (
    <div className="min-h-full bg-[#070706]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="border-b-2 border-stone-200/90 pb-4 mb-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">The Calabi Paper</p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl text-stone-50 tracking-tight">News</h1>
          <p className="mt-2 font-serif text-sm text-stone-500 italic">{edition}</p>
          <p className="mt-3 text-[11px] text-stone-600 max-w-md mx-auto">
            Stories from the community — paragraphs and pictures, laid out like a paper.
          </p>
        </header>

        <ComposePaper onOpenAuth={onOpenAuth} onPublished={() => setItems(listNewspaper())} />

        {items.length === 0 ? (
          <p className="font-serif text-center text-stone-500 py-16">
            No stories yet. Publish the first column above.
          </p>
        ) : (
          <div className={cn('columns-1 sm:columns-2 gap-8')}>
            {items.map((story) => (
              <div key={story.id} className="break-inside-avoid">
                <NewspaperStory
                  story={story}
                  canDelete={Boolean(user?.id && story.authorId === user.id)}
                  onDelete={() => {
                    deleteNewspaperPost(story.id, user.id)
                    setItems(listNewspaper())
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-stone-700">
          <button type="button" className="underline" onClick={() => onNavigate?.('home')}>
            Back to Recommended
          </button>
        </p>
      </div>
    </div>
  )
}
