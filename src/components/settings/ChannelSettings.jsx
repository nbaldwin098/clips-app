import { useState } from 'react'

export default function ChannelSettings() {
  const [category, setCategory] = useState('')
  const [links, setLinks] = useState({ x: '', discord: '', website: '' })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Channel & Branding</h1>
        <p className="mt-1 text-sm text-slate-500">Public appearance, category, and external links.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Primary category</h2>
        <select value={category} onChange={e => setCategory(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm max-w-xs">
          <option value="">Select category</option>
          <option value="gaming">Gaming</option>
          <option value="tech">Technology</option>
          <option value="irl">Just Chatting / IRL</option>
          <option value="creative">Creative</option>
          <option value="music">Music</option>
          <option value="esports">Esports</option>
          <option value="education">Education</option>
        </select>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Social links</h2>
        <div className="grid gap-3 max-w-md">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">X / Twitter</span>
            <input value={links.x} onChange={e => setLinks(l => ({ ...l, x: e.target.value }))} className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="https://x.com/..." />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Discord</span>
            <input value={links.discord} onChange={e => setLinks(l => ({ ...l, discord: e.target.value }))} className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="https://discord.gg/..." />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Website</span>
            <input value={links.website} onChange={e => setLinks(l => ({ ...l, website: e.target.value }))} className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="https://..." />
          </label>
        </div>
        <button className="h-9 px-4 rounded-lg bg-[#000000] text-white text-sm font-medium">Save links</button>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Verified badge</h2>
        <p className="text-sm text-slate-500">Submit a verification request after meeting eligibility criteria (identity, activity, authenticity).</p>
        <button className="h-9 px-4 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">Request verification</button>
      </section>
    </div>
  )
}
