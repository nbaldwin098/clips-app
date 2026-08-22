import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { createTicket, listTickets } from '../lib/moderation'

export default function SupportPage({ onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)
  const mine = isAuthenticated ? listTickets().filter((t) => t.userId === user?.id) : []

  const submit = (e) => {
    e.preventDefault()
    if (!isAuthenticated) return
    createTicket({
      userId: user.id,
      email: user.email,
      subject: subject.trim(),
      body: body.trim(),
    })
    setSent(true)
    setSubject('')
    setBody('')
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[#007ACC]">Customer support</h1>
        <p className="text-xs text-zinc-500 mt-1">Report issues, appeals, payment questions. Tickets go to the admin portal.</p>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-zinc-400">
          <button type="button" onClick={onOpenAuth} className="text-[#007ACC] font-medium">Sign in</button> to open a ticket.
        </p>
      ) : (
        <form onSubmit={submit} className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-3">
          {sent && <p className="text-xs text-green-400">Ticket submitted.</p>}
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="Subject"
            className="w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            placeholder="Describe the issue"
            className="w-full rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 py-2 text-sm text-zinc-100"
          />
          <button type="submit" className="h-10 px-4 rounded-lg bg-[#007ACC] text-white text-sm font-medium">
            Submit ticket
          </button>
        </form>
      )}

      {mine.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-300">Your tickets</h2>
          {mine.map((t) => (
            <div key={t.id} className="rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-zinc-100">{t.subject}</span>
                <span className="text-xs text-[#007ACC]">{t.status}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
