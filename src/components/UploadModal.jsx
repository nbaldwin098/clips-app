import { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishLocalMedia, stashWatchItem } from '../lib/contentService'
import { canPost, postDeniedMessage } from '../lib/trustSafety'
import { LIVE_CATEGORIES, mergeTags } from '../lib/mediaMeta'
import HashtagInput from './HashtagInput'
import { cn } from '../lib/utils'

const VISIBILITY = [
  { id: 'public', label: 'Public' },
  { id: 'unlisted', label: 'Unlisted' },
  { id: 'private', label: 'Private' },
]

export default function UploadModal({ open, onClose, onDone, initialKind = 'video' }) {
  const { user } = useAuth()
  const [kind, setKind] = useState(initialKind === 'short' ? 'short' : 'video')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [priceUsd, setPriceUsd] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setKind(initialKind === 'short' ? 'short' : 'video')
    setFile(null)
    setPreviewUrl('')
    setTitle('')
    setDescription('')
    setCategory('')
    setTagsText('')
    setVisibility('public')
    setPriceUsd('')
    setErr('')
    setProgress('')
    setBusy(false)
  }, [open, initialKind])

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])


  if (!open) return null

  const reset = () => {
    setFile(null)
    setPreviewUrl('')
    setTitle('')
    setDescription('')
    setCategory('')
    setTagsText('')
    setVisibility('public')
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
      const tagBits = [
        ...String(tagsText || '').split(/[,#\s]+/).map((t) => t.trim()).filter(Boolean),
        category ? String(category).toLowerCase().replace(/\s+/g, '-') : '',
      ].filter(Boolean)
      const published = await publishLocalMedia(file, user, {
        type: kind === 'short' ? 'short' : 'video',
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        status: 'published',
        priceUsd: priceUsd ? Number(priceUsd) : 0,
        tags: mergeTags(tagBits, description),
        visibility,
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
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl max-h-[92dvh] overflow-hidden border border-zinc-800 bg-[#0a0a0e] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-800 shrink-0">
          <p className="text-sm font-semibold text-white">
            {kind === 'short' ? 'Upload clip' : 'Upload video'}
          </p>
          <button type="button" aria-label="Close upload" onClick={() => { reset(); onClose() }} className="h-8 w-8 flex items-center justify-center hover:bg-zinc-800">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-0">
            {/* Preview + look filters */}
            <div className="border-b sm:border-b-0 sm:border-r border-zinc-800 bg-black p-4 space-y-3">
              <div className={`${kind === 'short' ? 'aspect-[9/16] max-h-[42vh] max-w-xs' : 'aspect-video'} mx-auto w-full bg-[#111] overflow-hidden flex items-center justify-center`}>
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    className={`h-full w-full ${kind === 'short' ? 'object-contain' : 'object-cover'}`}
                   
                    controls
                    muted
                    playsInline
                  />
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700"
                  >
                    <Upload className="h-7 w-7" />
                    <span className="text-xs">Select video file</span>
                  </button>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setKind('short')} className={cn('flex-1 h-9 text-xs font-medium border', kind === 'short' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400')}>Clip</button>
                <button type="button" onClick={() => setKind('video')} className={cn('flex-1 h-9 text-xs font-medium border', kind === 'video' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400')}>Video</button>
              </div>
              <p className="text-[11px] text-zinc-500">
                {kind === 'short' ? 'Clips: max 60 seconds. MP4 works best.' : 'Videos: max 24 hours.'}
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/*"
                className="hidden"
                onChange={onPick}
              />
              {file ? (
                <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="w-full h-9 border border-zinc-800 text-xs text-zinc-400 hover:text-white truncate px-3">
                  {file.name}
                </button>
              ) : null}

              <label className="block text-xs text-zinc-400">Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full h-10 bg-black border border-zinc-800 px-3 text-sm text-white"
                  maxLength={120}
                  placeholder="Add a title that describes your video"
                />
              </label>
              <label className="block text-xs text-zinc-400">Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full min-h-[72px] bg-black border border-zinc-800 px-3 py-2 text-sm text-white resize-y"
                  maxLength={5000}
                  placeholder="Tell viewers about your video"
                />
              </label>

              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategory('')}
                    className={cn('h-7 px-2 text-[11px] border', !category ? 'border-white text-white' : 'border-zinc-800 text-zinc-500')}
                  >
                    None
                  </button>
                  {LIVE_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn('h-7 px-2 text-[11px] border', category === c ? 'border-white text-white' : 'border-zinc-800 text-zinc-500')}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Hashtags</p>
                <HashtagInput value={tagsText} onChange={setTagsText} description={description} />
              </div>

              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Visibility</p>
                <div className="flex gap-2">
                  {VISIBILITY.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVisibility(v.id)}
                      className={cn('flex-1 h-9 text-xs font-medium border', visibility === v.id ? 'border-white text-white' : 'border-zinc-800 text-zinc-500')}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs text-zinc-400">Price (USD, optional)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  placeholder="0 = free"
                  className="mt-1 w-full h-10 bg-black border border-zinc-800 px-3 text-sm text-white"
                />
              </label>

              {err ? <p className="text-xs text-red-400">{err}</p> : null}
              {progress ? (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {progress}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-800 px-4 py-3 flex justify-end gap-2">
          <button type="button" onClick={() => { reset(); onClose() }} className="h-10 px-4 text-sm text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !file}
            onClick={submit}
            className="h-10 px-5 bg-white text-black text-sm font-semibold disabled:opacity-40"
          >
            {busy ? 'Uploading…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
