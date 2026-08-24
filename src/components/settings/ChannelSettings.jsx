import { useEffect, useState } from 'react'
import { getUserSettings, saveUserSettings } from '../../lib/storage'

const field = 'mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100'

export default function ChannelSettings() {
  const stored = getUserSettings()
  const [category, setCategory] = useState(stored.channelCategory || '')
  const [links, setLinks] = useState({
    x: stored.links?.x || '',
    discord: stored.links?.discord || '',
    website: stored.links?.website || '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = getUserSettings()
    setCategory(s.channelCategory || '')
    setLinks({
      x: s.links?.x || '',
      discord: s.links?.discord || '',
      website: s.links?.website || '',
    })
  }, [])

  const save = () => {
    saveUserSettings({ channelCategory: category, links })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Channel & Branding</h1>
        <p className="mt-1 text-sm text-zinc-500">Category and links save on this device. They are not a verified badge.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Primary category</h2>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} max-w-xs`}>
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

      <section className="pt-6 border-t border-zinc-800 space-y-4">
        <h2 className="text-sm font-semibold text-white">Social links</h2>
        <div className="grid gap-3 max-w-md">
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">X</span>
            <input value={links.x} onChange={(e) => setLinks((l) => ({ ...l, x: e.target.value }))} className={field} placeholder="https://x.com/..." />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">Discord</span>
            <input value={links.discord} onChange={(e) => setLinks((l) => ({ ...l, discord: e.target.value }))} className={field} placeholder="https://discord.gg/..." />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">Website</span>
            <input value={links.website} onChange={(e) => setLinks((l) => ({ ...l, website: e.target.value }))} className={field} placeholder="https://..." />
          </label>
        </div>
        <button type="button" onClick={save} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
          {saved ? 'Saved' : 'Save links'}
        </button>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Verified badge</h2>
        <p className="text-sm text-zinc-500">
          There is no verification queue yet. Do not expect a checkmark from a button on this page.
        </p>
      </section>
    </div>
  )
}
