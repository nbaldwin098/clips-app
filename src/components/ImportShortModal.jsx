import { useState } from 'react'
import { X, Link2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { importUserLink } from '../lib/contentService'
import { useAuth } from '../context/AuthContext'
import ErrorReportPrompt from './ErrorReportPrompt'

export default function ImportShortModal({ open, onClose, onOpenAuth }) {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  if (!open) return null

  const handleParse = () => {
    setError('')
    setResult(null)
    setSaved(false)
    if (!user?.id) {
      onOpenAuth?.()
      setError('Sign in to import.')
      return
    }
    const res = importUserLink(url.trim(), user)
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-black/70"
        aria-hidden="true"
        onClick={() => {
          reset()
          onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        className="relative w-full max-w-md rounded-2xl bg-[#1f1f23] shadow-2xl border border-[#2f2f37]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f37]">
          <h2 id="import-modal-title" className="text-base font-semibold text-[#efeff1]">Import clip</h2>
          <button
            type="button"
            onClick={() => {
              reset()
              onClose()
            }}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-400">
            Paste a public short link. Only metadata and a reference URL are stored — not the video file.
          </p>
          {!user?.id ? (
            <button
              type="button"
              onClick={() => onOpenAuth?.()}
              className="w-full h-10 rounded-lg bg-white text-black text-sm font-bold hover:bg-zinc-200"
            >
              Sign in to import
            </button>
          ) : null}
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@… or youtube.com/shorts/…"
              className="w-full h-10 rounded-lg border border-zinc-700 bg-[#000000] pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white/40"
            />
          </div>
          {error && (
            <>
              <p className="text-sm text-red-400">{error}</p>
              <ErrorReportPrompt
                message={error}
                context="import"
                detail={url.trim() ? `url=${url.trim().slice(0, 240)}` : ''}
                onOpenAuth={onOpenAuth}
              />
            </>
          )}
          {result && (
            <div className="rounded-lg border border-zinc-700 bg-[#18181b] p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <CheckCircle2 className="h-4 w-4 text-white" />
                {saved ? 'Saved to library' : 'Reference ready'}
              </div>
              <p className="text-xs text-zinc-400">{result.title}</p>
              <p className="text-xs text-zinc-400">
                Origin: {result.origin || result.platform || 'unknown'}
              </p>
              {result.crossPost?.isCrossPost && (
                <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-2.5 py-2 text-xs text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Cross-post detected
                    {result.crossPost.platformLabel ? ` (${result.crossPost.platformLabel})` : ''}.
                    Allowed; originality bonus will not apply.
                  </span>
                </div>
              )}
              <p className="text-xs text-zinc-500 break-all">{result.sourceUrl}</p>
            </div>
          )}
          {user?.id ? (
            <button
              type="button"
              onClick={handleParse}
              className="w-full h-10 rounded-lg bg-white text-black text-sm font-bold hover:bg-zinc-200"
            >
              Import link
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
