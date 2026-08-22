import { useState } from 'react'
import { X, Link2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { importUserLink } from '../lib/contentService'

export default function ImportShortModal({ open, onClose }) {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  if (!open) return null

  const handleParse = () => {
    setError('')
    setResult(null)
    setSaved(false)
    const res = importUserLink(url.trim())
    if (!res.ok) {
      setError(res.error || 'Unable to import URL.')
      return
    }
    setResult(res.item)
    setSaved(true)
  }

  const reset = () => {
    setUrl('')
    setResult(null)
    setError('')
    setSaved(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          reset()
          onClose()
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Import Short</h2>
          <button
            onClick={() => {
              reset()
              onClose()
            }}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Paste a public short link. Only metadata and a reference URL are stored — not the video file.
          </p>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@… or youtube.com/shorts/…"
              className="w-full h-10 rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {saved ? 'Saved to library' : 'Reference ready'}
              </div>
              <p className="text-xs text-slate-600">{result.title}</p>
              <p className="text-xs text-slate-600">
                Origin: {result.origin || result.platform || 'unknown'} · {result.storedBytes} bytes stored
              </p>
              {result.crossPost?.isCrossPost && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-100 px-2.5 py-2 text-xs text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Cross-post detected
                    {result.crossPost.platformLabel ? ` (${result.crossPost.platformLabel})` : ''}.
                    Allowed; originality bonus will not apply.
                  </span>
                </div>
              )}
              <p className="text-xs text-slate-500 break-all">{result.sourceUrl}</p>
            </div>
          )}
          <button
            onClick={handleParse}
            className="w-full h-10 rounded-lg bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
          >
            Import link
          </button>
        </div>
      </div>
    </div>
  )
}
