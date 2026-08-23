import { useState, useRef } from 'react'
import { X, Upload, Film } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishLocalMedia } from '../lib/contentService'
import { isSupabaseConfigured } from '../lib/supabaseClient'

/** Pick file → upload to Supabase Storage (public link) when configured, else local link. */
export default function UploadModal({ open, onClose }) {
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const [hosted, setHosted] = useState(false)

  if (!open) return null

  const onPick = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setStatus('reading')
    setMeta(null)
    setError('')
    setHosted(false)
    try {
      const published = await publishLocalMedia(f, user)
      if (!published.ok) {
        setError(published.error || 'Could not save this file.')
        setStatus('error')
        return
      }
      setHosted(!!published.hosted)
      setMeta({
        name: f.name,
        sizeMb: Math.round((f.size / (1024 * 1024)) * 10) / 10,
        width: published.item?.width || 1920,
        height: published.item?.height || 1080,
        duration: published.item?.durationSec || 0,
        type: published.item?.type || 'video',
        url: published.item?.mediaUrl || '',
      })
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(err?.message || 'Could not read this file.')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-[#1f1f23] shadow-2xl border border-[#2f2f37]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f37]">
          <h2 className="text-base font-semibold text-[#efeff1]">Upload clip</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-400 leading-relaxed">
            {isSupabaseConfigured()
              ? 'We upload your file and turn it into a Clips link (Supabase Storage). Keep files under ~80MB.'
              : 'Storage not connected yet — file stays on this device only. Add Supabase bucket "clips" for shared links.'}
          </p>
          {!isAuthenticated && (
            <p className="text-xs text-amber-400">Sign in first so the clip is tied to your account.</p>
          )}
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full h-28 rounded-xl border border-dashed border-[#3f3f46] bg-[#18181b] hover:bg-[#26262c] flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <Upload className="h-6 w-6 text-[#007ACC]" />
            <span className="text-sm font-medium text-zinc-200">Choose video</span>
            <span className="text-xs text-zinc-500">Converts to a playable link</span>
          </button>
          {status === 'reading' && <p className="text-sm text-zinc-400">Uploading / processing…</p>}
          {status === 'error' && <p className="text-sm text-red-400">{error || 'Could not read this file.'}</p>}
          {meta && (
            <div className="rounded-lg border border-[#2f2f37] bg-[#18181b] p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-medium text-white">
                <Film className="h-4 w-4 text-[#007ACC]" />
                {meta.name}
              </div>
              <p className="text-xs text-zinc-400">
                {meta.sizeMb} MB · {meta.width}×{meta.height} · {meta.duration}s · {meta.type}
              </p>
              <p className={`text-xs mt-2 ${hosted ? 'text-green-400' : 'text-amber-400'}`}>
                {hosted
                  ? 'Live link created — others can play this when the feed loads it.'
                  : 'Saved on this device only (shared hosting not available yet).'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
