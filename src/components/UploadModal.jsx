import { useState, useRef } from 'react'
import { X, Upload, Film } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishLocalMedia } from '../lib/contentService'

/**
 * Client-side compression path (MVP shell).
 * Spec: never send raw masters; transcode in-browser toward ~720p vertical
 * before any network request. Full ffmpeg.wasm / MediaRecorder pipeline is next.
 */
export default function UploadModal({ open, onClose }) {
  const { user } = useAuth()
  const inputRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')

  if (!open) return null

  const onPick = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setStatus('reading')
    setMeta(null)
    setError('')
    try {
      const url = URL.createObjectURL(f)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = url
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
      })
      const published = publishLocalMedia(f, user, {
        type: video.duration && video.duration <= 90 ? 'short' : 'video',
      })
      if (!published.ok) {
        setError(published.error || 'Could not save this file.')
        setStatus('error')
        URL.revokeObjectURL(url)
        return
      }
      setMeta({
        name: f.name,
        sizeMb: Math.round((f.size / (1024 * 1024)) * 10) / 10,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration * 10) / 10,
      })
      URL.revokeObjectURL(url)
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('Could not read this file.')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-[#14141d] shadow-2xl border border-[#2c2c3c]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#252535]">
            <h2 className="text-base font-semibold text-white">Upload video</h2>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800">
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Upload a video from this device. It is saved to your library on this browser.
            </p>
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full h-28 rounded-xl border border-dashed border-[#3a3a4c] bg-[#1a1a26] hover:bg-[#232333] flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <Upload className="h-6 w-6 text-white" />
              <span className="text-sm font-medium text-zinc-200">Choose video file</span>
              <span className="text-xs text-zinc-500">Saved on this device</span>
            </button>
            {status === 'reading' && <p className="text-sm text-zinc-400">Reading metadata…</p>}
            {status === 'error' && <p className="text-sm text-red-400">{error || 'Could not read this file.'}</p>}
            {meta && (
              <div className="rounded-lg border border-[#303042] bg-[#1a1a28] p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 font-medium text-white">
                  <Film className="h-4 w-4 text-white" />
                  {meta.name}
                </div>
                <p className="text-xs text-zinc-400">{meta.sizeMb} MB · {meta.width}×{meta.height} · {meta.duration}s</p>
                <p className="text-xs text-white mt-2">
                  Saved to your library. It will show on Recommended and Clips.
                </p>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
