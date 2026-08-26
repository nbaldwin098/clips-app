import { useEffect, useState } from 'react'
import {
  listNews,
  syncNewsFromCloud,
  publishNewsPost,
  unpublishNewsPost,
} from '../lib/siteNews'

export default function AdminNews() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('Update')
  const [destView, setDestView] = useState('home')
  const [ctaLabel, setCtaLabel] = useState('Open')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState(() => listNews())

  const refresh = async () => {
    const rows = await syncNewsFromCloud()
    setItems(rows)
  }

  useEffect(() => {
    refresh().catch(() => {})
  }, [])

  const onPublish = async () => {
    setBusy(true)
    setNote('')
    const res = await publishNewsPost({ title, body, tag, destView, ctaLabel, published: true })
    setBusy(false)
    if (res.ok) {
      setTitle('')
      setBody('')
      setNote('Published to News tab.')
      await refresh()
    } else {
      setNote(res.error || 'Publish failed — run migration 0019 and sign in as admin.')
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h2 className="text-sm font-semibold text-white">News</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Posts show on the left-menu News tab. Requires migration 0019 and an admin profile.
        </p>
      </div>
      <div className="space-y-2 border border-zinc-800 rounded-xl p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline"
          className="w-full h-9 border border-zinc-800 bg-black px-2 text-sm text-white"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Body"
          rows={4}
          className="w-full border border-zinc-800 bg-black px-2 py-2 text-sm text-white"
        />
        <div className="grid grid-cols-3 gap-2">
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white" />
          <input value={destView} onChange={(e) => setDestView(e.target.value)} placeholder="dest view" className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white" />
          <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="CTA" className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white" />
        </div>
        <button
          type="button"
          disabled={busy || !title.trim() || !body.trim()}
          onClick={onPublish}
          className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold disabled:opacity-50"
        >
          {busy ? '…' : 'Publish'}
        </button>
        {note ? <p className="text-xs text-amber-400">{note}</p> : null}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400 flex justify-between gap-2">
            <span className="min-w-0">
              <span className="text-white font-medium">{item.title}</span>
              <span className="text-zinc-600"> · {item.source || 'seed'}</span>
            </span>
            {item.source === 'cloud' ? (
              <button
                type="button"
                className="shrink-0 underline"
                onClick={async () => {
                  await unpublishNewsPost(item.id)
                  await refresh()
                }}
              >
                Unpublish
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
