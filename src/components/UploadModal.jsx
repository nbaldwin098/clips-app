import { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishLocalMedia, getShortsFeed, getById } from '../lib/contentService'
import { stashWatchItem } from '../lib/contentService'
import { canPost, postDeniedMessage } from '../lib/trustSafety'

export default function UploadModal({ open, onClose, onDone, initialKind = 'video' }) {
  const { user } = useAuth()
  const [kind, setKind] = useState(initialKind === 'short' ? 'short' : 'video')
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceUsd, setPriceUsd] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setKind(initialKind === 'short' ? 'short' : 'video')
    setFile(null)
    setTitle('')
    setDescription('')
    setPriceUsd('')
    setErr('')
    setProgress('')
    setBusy(false)
  }, [open, initialKind])

  if (!open) return null

  const reset = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setPriceUsd('')
    setErr('')
    setProgress('')
    setBusy(false)
  }

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setErr('')
    if (!title.trim()) {
      setTitle(String(f.name || '').replace(/\.[^.]+$/, '').slice(0, 120))
    }
  }

  const submit = async () => {
    if (!user?.id) {
      setErr('Sign in to upload.')
      return
    }
    if (!canPost(user)) {
      setErr(postDeniedMessage(user) || 'You cannot post right now.')
      return
    }
    if (!file) {
      setErr('Choose a video file.')
      return
    }
    setBusy(true)
    setErr('')
    setProgress('Uploading…')
    try {
      const published = await publishLocalMedia(file, user, {
        type: kind === 'short' ? 'short' : 'video',
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        status: 'published',
        priceUsd: priceUsd ? Number(priceUsd) : 0,
      })
      if (!published.ok || !published.item) {
        setErr(published.error || "Couldn't upload. Try again.")
        setBusy(false)
        setProgress('')
        return
      }
      try { stashWatchItem(published.item) } catch {}
      setProgress('Done')
      onDone?.(published.item)
      reset()
      onClose?.()
    } catch (e) {
      setErr(e?.message || "Couldn't upload. Try again.")
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#111113] shadow-xl">
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/10">
          <p className="text-sm font-semibold text-white">Upload</p>
          <button type="button" aria-label="Close upload" onClick={() => { reset(); onClose() }} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setKind('short')} className={`flex-1 h-9 rounded-lg text-xs font-medium ${kind === 'short' ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-400'}`}>Clip</button>
            <button type="button" onClick={() => setKind('video')} className={`flex-1 h-9 rounded-lg text-xs font-medium ${kind === 'video' ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-400'}`}>Video</button>
          </div>
          <p className="text-[11px] text-zinc-500">
            {kind === 'short'
              ? 'Clips: max 60 seconds. MP4 works best on phones.'
              : 'Videos: max 24 hours.'}
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/*"
            className="hidden"
            onChange={onPick}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="w-full h-24 rounded-xl border border-dashed border-white/15 bg-black/40 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-white/30"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs">{file ? file.name : 'Choose video file'}</span>
          </button>

          <label className="block text-xs text-zinc-400">Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg bg-black border border-white/10 px-3 text-sm text-white"
              maxLength={120}
            />
          </label>
          <label className="block text-xs text-zinc-400">Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full min-h-[72px] rounded-lg bg-black border border-white/10 px-3 py-2 text-sm text-white resize-y"
              maxLength={5000}
            />
          </label>
          <label className="block text-xs text-zinc-400">Price (USD, optional paid post)
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              placeholder="0 = free"
              className="mt-1 w-full h-10 rounded-lg bg-black border border-white/10 px-3 text-sm text-white"
            />
          </label>

          {err ? <p className="text-xs text-red-400">{err}</p> : null}
          {progress ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {progress}
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy || !file}
            onClick={submit}
            className="w-full h-11 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-40"
          >
            {busy ? 'Uploading…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
