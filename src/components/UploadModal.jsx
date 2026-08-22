import { useState, useRef } from 'react'
import { X, Upload, Film } from 'lucide-react'

/**
 * Client-side compression path (MVP shell).
 * Spec: never send raw masters; transcode in-browser toward ~720p vertical
 * before any network request. Full ffmpeg.wasm / MediaRecorder pipeline is next.
 */
export default function UploadModal({ open, onClose }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [meta, setMeta] = useState(null)

  if (!open) return null

  const onPick = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setStatus('reading')
    setMeta(null)
    try {
      const url = URL.createObjectURL(f)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = url
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
      })
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
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Upload</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Raw masters never hit our servers. The client will scale to mobile-ready 720p vertical and
            compress before any network request. Full transcoder ships in the next iteration.
          </p>
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full h-28 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-[#EBF4FA]/50 flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <Upload className="h-6 w-6 text-[#2C729B]" />
            <span className="text-sm font-medium text-slate-700">Choose video file</span>
            <span className="text-xs text-slate-400">Inspected locally only</span>
          </button>
          {status === 'reading' && <p className="text-sm text-slate-500">Reading metadata…</p>}
          {status === 'error' && <p className="text-sm text-red-600">Could not read this file.</p>}
          {meta && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <Film className="h-4 w-4 text-[#2C729B]" />
                {meta.name}
              </div>
              <p className="text-xs text-slate-600">{meta.sizeMb} MB · {meta.width}×{meta.height} · {meta.duration}s</p>
              <p className="text-xs text-amber-700 mt-2">
                Compression pipeline not yet active. File was not uploaded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
