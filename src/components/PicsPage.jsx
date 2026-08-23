import { useState, useRef, useCallback } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPicsFeed, publishPhoto } from '../lib/picsService'
import { isSupabaseConfigured } from '../lib/supabaseClient'

/** Pure photo wall — no titles/names on the grid. Hover zooms; click opens lightbox. */
export default function PicsPage({ onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const [items, setItems] = useState(() => getPicsFeed())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(null)

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
    try {
      const res = await publishPhoto(file, user)
      if (!res.ok) {
        setError(res.error || 'Upload failed.')
        return
      }
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
    <div className="min-h-full bg-[#09090c]">
      <div className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#09090c]/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Pics</h1>
          <p className="text-[11px] text-zinc-500">Photos only · hover to peek · click to open</p>
        </div>
        <button type="button" onClick={openUpload} disabled={busy} className="h-9 px-3 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5">
          <ImagePlus className="h-4 w-4" />
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>

      {error && <p className="px-4 pt-3 text-sm text-red-400">{error}</p>}
      {!isSupabaseConfigured() && (
        <p className="px-4 pt-2 text-[11px] text-zinc-600">Storage offline — pics stay on this device until the clips bucket is public.</p>
      )}

      {items.length === 0 ? (
        <div className="m-4 rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <p className="text-sm text-zinc-300">No pics yet</p>
          <button type="button" onClick={openUpload} className="mt-4 h-9 px-4 rounded-lg bg-white text-black text-sm font-semibold">Upload first pic</button>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-1 p-1 pb-20">
          {items.map((pic) => {
            const src = pic.mediaUrl || pic.thumbUrl || pic.sourceUrl
            return (
              <button
                key={pic.id}
                type="button"
                onClick={() => setLightbox(pic)}
                className="mb-1 w-full break-inside-avoid relative overflow-hidden bg-zinc-900 group focus:outline-none"
              >
                <img
                  src={src}
                  alt=""
                  className="w-full block object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
              </button>
            )
          })}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-3" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center" onClick={() => setLightbox(null)} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox.mediaUrl || lightbox.thumbUrl || lightbox.sourceUrl}
            alt=""
            className="max-h-[92vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
