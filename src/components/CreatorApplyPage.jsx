import { useAuth } from '../context/AuthContext'
import { CONTENT_RULES_SHORT } from '../lib/orgConfig'

export default function CreatorApplyPage({ onOpenAuth, onNavigate }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto text-sm text-zinc-400">
        <button type="button" onClick={onOpenAuth} className="text-white font-medium">Sign in</button> to post. Anyone with an account can upload.
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg mx-auto rounded-2xl border border-zinc-800 bg-[#121218] space-y-4">
      <h1 className="text-lg font-semibold text-white">You can post</h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        There is no application. Anyone signed in can upload, use Studio, and start a live lobby listing from the + button.
      </p>
      <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-4">
        {CONTENT_RULES_SHORT.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onNavigate?.('dashboard')} className="h-10 px-4 rounded-lg bg-white text-black text-sm font-semibold">Open Studio</button>
        <button type="button" onClick={() => onNavigate?.('content-rules')} className="h-10 px-4 rounded-lg border border-zinc-700 text-sm text-zinc-200">Content rules</button>
      </div>
    </div>
  )
}
