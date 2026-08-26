import { useEffect, useState } from 'react'
import { getUserSettings, saveUserSettings } from '../../lib/storage'
import { useAuth } from '../../context/AuthContext'
import { getIdVerificationForUser, isVerifiedChannel } from '../../lib/verification'
import { isOfficialCreator } from '../../lib/uiFormat'

const field = 'mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100'

export default function ChannelSettings({ onNavigate }) {
  const { user } = useAuth()
  const stored = getUserSettings()
  const [category, setCategory] = useState(stored.channelCategory || '')
  const [links, setLinks] = useState({
    x: stored.links?.x || '',
    discord: stored.links?.discord || '',
    website: stored.links?.website || '',
  })
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const s = getUserSettings()
    setCategory(s.channelCategory || '')
    setLinks({
      x: s.links?.x || '',
      discord: s.links?.discord || '',
      website: s.links?.website || '',
    })
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    saveUserSettings({ channelCategory: category, links })
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [ready, category, links])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Channel & Branding</h1>
        <p className="mt-1 text-sm text-zinc-500">Category and links save on this device. The checkmark is a separate ID review.</p>
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
        <p className="text-[11px] text-zinc-500">{saved ? 'Saved' : 'Saved as you type.'}</p>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Post to socials</h2>
        <p className="text-xs text-zinc-500 max-w-md">
          Connect YouTube, TikTok, Instagram, X, or Facebook and push videos, clips, pics, or VODs from Calabi Studio → Socials. Profile links above are branding only.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('calabi-studio', 'socials')}
          className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium"
        >
          Open Calabi Studio Socials
        </button>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Verified badge</h2>
        <p className="text-sm text-zinc-500">
          {isOfficialCreator(user?.id, user?.handle)
            ? 'This library channel already has the official checkmark.'
            : isVerifiedChannel(user?.id, user?.handle)
              ? 'Your checkmark is on. It is separate from creator status.'
              : getIdVerificationForUser(user?.id)?.status === 'pending'
                ? 'Front and back of your ID are in review.'
                : 'Upload the front and back of a government ID. We accept or deny it. You can do this with or without creator status.'}
        </p>
        {!isOfficialCreator(user?.id, user?.handle) ? (
          <button type="button" onClick={() => onNavigate?.('verify')} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
            {isVerifiedChannel(user?.id, user?.handle) ? 'View checkmark' : 'Get a checkmark'}
          </button>
        ) : null}
      </section>
    </div>
  )
}
