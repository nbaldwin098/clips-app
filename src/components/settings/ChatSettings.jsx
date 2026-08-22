import { useState } from 'react'

export default function ChatSettings() {
  const [slowMode, setSlowMode] = useState(0)
  const [subOnly, setSubOnly] = useState(false)
  const [followerOnly, setFollowerOnly] = useState(false)
  const [blockedTerms, setBlockedTerms] = useState('')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Chat & Moderation</h1>
        <p className="mt-1 text-sm text-slate-500">Slow mode, audience gates, and AutoMod filters.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Rate limiting</h2>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-slate-600">Slow mode (seconds between messages)</span>
          <select value={slowMode} onChange={e => setSlowMode(Number(e.target.value))} className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm">
            <option value={0}>Off</option>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
            <option value={120}>120 seconds</option>
          </select>
        </label>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Audience restrictions</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={subOnly} onChange={e => setSubOnly(e.target.checked)} className="rounded border-slate-300 text-[#2C729B]" />
          <span className="text-sm text-slate-700">Subscribers only</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={followerOnly} onChange={e => setFollowerOnly(e.target.checked)} className="rounded border-slate-300 text-[#2C729B]" />
          <span className="text-sm text-slate-700">Followers only</span>
        </label>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Blocked terms</h2>
        <p className="text-xs text-slate-500">One term or phrase per line. Messages containing these are automatically removed.</p>
        <textarea value={blockedTerms} onChange={e => setBlockedTerms(e.target.value)} rows={5} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="spam\nscam link\n..." />
        <button className="h-9 px-4 rounded-lg bg-[#2C729B] text-white text-sm font-medium">Save filters</button>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Moderators</h2>
        <p className="text-sm text-slate-500">Assign moderators from your followers. No moderators assigned yet.</p>
        <input placeholder="Search username to add as mod" className="w-full max-w-sm h-10 rounded-lg border border-slate-200 px-3 text-sm" />
      </section>
    </div>
  )
}
