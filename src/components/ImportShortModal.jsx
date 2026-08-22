import { useState } from 'react'
import { X, Link2, CheckCircle2 } from 'lucide-react'
import { parseExternalShort } from '../lib/storage'

export default function ImportShortModal({ open, onClose }) {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  if (!open) return null

  const handleParse = () => {
    setError('')
    setResult(null)
    const parsed = parseExternalShort(url.trim())
    if (!parsed) {
      setError('Unable to parse URL. Provide a valid TikTok, YouTube Shorts, Instagram, Twitch, or Kick link.')
      return
    }
    setResult(parsed)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Import Short</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Paste a public short link. The system stores only metadata and a reference URL.
            No video binary is downloaded or stored in the database.
          </p>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@... or youtube.com/shorts/..."
              className="w-full h-10 rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Reference created
              </div>
              <p className="text-xs text-slate-600">Platform: {result.platform}</p>
              <p className="text-xs text-slate-600">Stored size: {result.storedBytes} bytes</p>
              <p className="text-xs text-slate-500 break-all">{result.sourceUrl}</p>
            </div>
          )}
          <button
            onClick={handleParse}
            className="w-full h-10 rounded-lg bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
          >
            Create zero-storage reference
          </button>
        </div>
      </div>
    </div>
  )
}
