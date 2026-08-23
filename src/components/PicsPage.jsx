import { useState, useRef, useCallback } from 'react'
import { ImagePlus, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPicsFeed, publishPhoto } from '../lib/picsService'
import { isSupabaseConfigured } from '../lib/supabaseClient'

/** Continuous photo feed — each pic in its own box. Avatar + name top-left. */
export default function PicsPage({ onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const [items, setItems] = useState(() => getPicsFeed())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const refresh = useCallback(() => setItems(getPicsFeed()), [])

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const res = await publishPhoto(file, user)
      if (!res.ok) {
        setError(res.error || 'Upload failed.')
        return
      }
      setMsg(res.hosted ? 'Photo live as a shared link.' : 'Saved on this device (connect Storage for shared links).')
      refresh()
    } catch (err) {
      setError(err?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const openUpload = () => {
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    inputRef.current?.click()
  }

  return (
    <div className="min-h-full bg-[#0e0e10]">
      <div className="sticky top-0 z-10 border-b border-[#2f2f37] bg-[#0e0e10]/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#efeff1]">Pics</h1>
          <p className="text-[11px] text-zinc-500">
            Continuous photo feed · each post is its own box
            {isSupabaseConfigured() ? ' · uploads become links' : ' · local until Storage is connected'}
          </p>
        </div>
        <button
          type="button"
          onClick={openUpload}
          disabled={busy}
          className="shrink-0 h-9 px-3 rounded-lg bg-[#007ACC] text-white text-sm font-medium hover:bg-[#0098ff] disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          <ImagePlus className="h-4 w-4" />
          {busy ? 'Uploading…' : 'Upload pic'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>

      {(error || msg) && (
        <div className="px-4 pt-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {msg && <p className="text-sm text-green-400">{msg}</p>}
        </div>
      )}

      <div className="flex flex-col gap-0 max-w-xl mx-auto w-full pb-16">
        {items.length === 0 && (
          <div className="m-4 rounded-xl border border-[#2f2f37] bg-[#1f1f23] px-6 py-16 text-center">
            <p className="text-sm text-zinc-300">No pics yet</p>
            <p className="text-xs text-zinc-500 mt-1">Upload a photo to start the feed.</p>
            <button type="button" onClick={openUpload} className="mt-4 h-9 px-4 rounded-lg bg-[#007ACC] text-white text-sm">
              Upload first pic
            </button>
          </div>
        )}

        {items.map((pic) => {
          const name = pic.displayName || pic.handle || 'User'
          const handle = pic.handle ? `@${String(pic.handle).replace(/^@/, '')}` : ''
          const initial = String(name).charAt(0).toUpperCase()
          return (
            <article key={pic.id} className="relative border-b border-[#2f2f37] bg-[#121214]">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 max-w-[85%]">
                <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white/80 bg-[#007ACC] flex items-center justify-center shrink-0 shadow-md">
                  {pic.avatarUrl ? (
                    <img src={pic.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-white">{initial || <User className="h-4 w-4" />}</span>
                  )}
                </div>
                <div className="min-w-0 rounded-full bg-black/55 backdrop-blur-sm px-2.5 py-1">
                  <p className="text-xs font-semibold text-white truncate">{name}</p>
                  {handle && <p className="text-[10px] text-zinc-300 truncate">{handle}</p>}
                </div>
              </div>
              <div className="w-full bg-black">
                <img
                  src={pic.mediaUrl || pic.thumbUrl || pic.sourceUrl}
                  alt={pic.title || 'Photo'}
                  className="w-full max-h-[85vh] object-contain mx-auto block"
                  loading="lazy"
                />
              </div>
              {pic.title && pic.title !== 'Photo' && (
                <p className="px-3 py-2 text-xs text-zinc-400 truncate">{pic.title}</p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
