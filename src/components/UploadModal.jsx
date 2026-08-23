import { useState, useRef } from 'react'
import { X, Upload, Film } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishLocalMedia } from '../lib/contentService'
import SoundPicker from './SoundPicker'

export default function UploadModal({ open, onClose, initialKind = 'video', onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState(initialKind === 'short' ? 'short' : 'video')
  const [sound, setSound] = useState(null)
  const [status, setStatus] = useState('idle')
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const [hosted, setHosted] = useState(false)

  if (!open) return null

  const reset = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setKind(initialKind === 'short' ? 'short' : 'video')
    setSound(null)
    setStatus('idle')
    setMeta(null)
    setError('')
    setHosted(false)
  }

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setMeta(null)
    setError('')
    if (!title.trim()) setTitle(String(f.name || '').replace(/\.[^.]+$/, '') || '')
  }

  const submit = async () => {
    if (!file) {
      setError('Choose a video file.')
      return
    }
    if (!title.trim()) {
      setError('Add a title.')
      return
    }
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    setStatus('reading')
    setError('')
    try {
      const published = await publishLocalMedia(file, user, {
        type: kind,
        title: title.trim().slice(0, 120),
        description: description.trim().slice(0, 5000),
        sound,
      })
      if (!published.ok) {
        setError(published.error || 'Could not save this file.')
        setStatus('error')
        return
      }
      setHosted(!!published.hosted)
      setMeta({
        name: published.item?.title || title,
        sizeMb: Math.round((file.size / (1024 * 1024)) * 10) / 10,
        width: published.item?.width || 1920,
        height: published.item?.height || 1080,
        duration: published.item?.durationSec || 0,
        type: published.item?.type || kind,
        soundTitle: published.item?.soundTitle || sound?.title || null,
      })
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(err?.message || 'Could not read this file.')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => { reset(); onClose() }} />
      <div className="relative w-full max-w-md rounded-2xl bg-[#1f1f23] shadow-2xl border border-[#2f2f37] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f37] sticky top-0 bg-[#1f1f23] z-10">
          <h2 className="text-base font-semibold text-[#efeff1]">Upload</h2>
          <button type="button" onClick={() => { reset(); onClose() }} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {!isAuthenticated && <p className="text-xs text-amber-400">Sign in first.</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setKind('short')} className={`flex-1 h-9 rounded-lg text-xs font-medium ${kind === 'short' ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-400'}`}>Clip</button>
            <button type="button" onClick={() => setKind('video')} className={`flex-1 h-9 rounded-lg text-xs font-medium ${kind === 'video' ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-400'}`}>Video</button>
          </div>

          <label className="block text-xs text-zinc-400">Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 text-sm text-white" placeholder="What is this about?" />
          </label>
          <label className="block text-xs text-zinc-400">Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 py-2 text-sm text-white" placeholder="Tell viewers more…" />
          </label>

          <SoundPicker value={sound} onChange={setSound} onOpenAuth={onOpenAuth} />

          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
          <button type="button" onClick={() => inputRef.current?.click()} className="w-full h-24 rounded-xl border border-dashed border-zinc-700 bg-[#18181b] hover:bg-[#26262c] flex flex-col items-center justify-center gap-2">
            <Upload className="h-5 w-5 text-zinc-300" />
            <span className="text-sm text-zinc-200">{file ? file.name : 'Choose video file'}</span>
          </button>

          <button type="button" onClick={submit} disabled={status === 'reading' || !file} className="w-full h-10 rounded-lg bg-white text-black text-sm font-bold disabled:opacity-50">
            {status === 'reading' ? 'Uploading…' : 'Publish'}
          </button>

          {status === 'error' && <p className="text-sm text-red-400">{error}</p>}
          {meta && (
            <div className="rounded-lg border border-zinc-700 bg-[#18181b] p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-medium text-white"><Film className="h-4 w-4" />{meta.name}</div>
              <p className="text-xs text-zinc-400">{meta.sizeMb} MB · {meta.type}{meta.soundTitle ? ` · ${meta.soundTitle}` : ''}</p>
              <p className={`text-xs ${hosted ? 'text-green-400' : 'text-amber-400'}`}>{hosted ? 'Live shared link' : 'Saved on this device only'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
