import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { submitErrorReport } from '../lib/errorReports'
import { cn } from '../lib/utils'

export default function ErrorReportPrompt({
  message,
  context = 'general',
  detail = '',
  stack = '',
  className,
  onOpenAuth,
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!message || sent) {
    return sent ? (
      <p className={cn('text-[11px] text-zinc-500', className)}>Report sent. Support will review it in the admin portal.</p>
    ) : null
  }

  const send = () => {
    setBusy(true)
    try {
      submitErrorReport({
        user,
        context,
        message,
        detail,
        note: note.trim(),
        stack,
      })
      setSent(true)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className={cn('mt-2', className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] text-zinc-400 underline underline-offset-2 hover:text-white"
        >
          Report this error
        </button>
        {!user?.id && onOpenAuth ? (
          <span className="text-[11px] text-zinc-600">
            {' '}
            ·{' '}
            <button type="button" onClick={onOpenAuth} className="underline underline-offset-2 hover:text-zinc-300">
              Sign in
            </button>{' '}
            to attach your account
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('mt-2 rounded-lg border border-zinc-800 bg-[#0c0c10] p-3 space-y-2', className)}>
      <p className="text-[11px] text-zinc-400">Tell us what you were doing (optional).</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What happened right before this?"
        className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={send}
          className="h-8 px-3 rounded-lg bg-white text-black text-xs font-semibold disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send report'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="h-8 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
