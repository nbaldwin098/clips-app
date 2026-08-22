import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getApplicationForUser, submitCreatorApplication } from '../lib/moderation'

export default function CreatorApplyPage({ onOpenAuth }) {
  const { user, isAuthenticated, updateProfile } = useAuth()
  const existing = user ? getApplicationForUser(user.id) : null
  const [about, setAbout] = useState('')
  const [links, setLinks] = useState('')
  const [category, setCategory] = useState('gaming')
  const [done, setDone] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto text-sm text-zinc-400">
        <button type="button" onClick={onOpenAuth} className="text-[#007ACC] font-medium">Sign in</button> to apply.
      </div>
    )
  }

  if (user.creatorStatus === 'approved') {
    return (
      <div className="p-6 max-w-md mx-auto rounded-2xl border border-zinc-800 bg-[#121218] text-sm text-zinc-200">
        You are an approved creator. Studio and live tools are unlocked in the menu.
      </div>
    )
  }

  if (existing?.status === 'pending' || user.creatorStatus === 'pending' || done) {
    return (
      <div className="p-6 max-w-md mx-auto rounded-2xl border border-zinc-800 bg-[#121218] text-sm text-zinc-200">
        Application pending review. An admin will approve or reject it from the Admin portal.
      </div>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    submitCreatorApplication({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      handle: user.handle,
      about: about.trim(),
      links: links.trim(),
      category,
    })
    updateProfile({ creatorStatus: 'pending' })
    setDone(true)
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-[#007ACC]">Apply to create</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-4">
        Apply → staff review → unlock Studio, live, monetization tools.
      </p>
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-800 bg-[#121218] p-5">
        <label className="block text-xs text-[#007ACC]">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100">
            <option value="gaming">Gaming</option>
            <option value="irl">IRL</option>
            <option value="music">Music</option>
            <option value="education">Education</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-xs text-[#007ACC]">
          About your channel
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} required className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 py-2 text-sm text-zinc-100" />
        </label>
        <label className="block text-xs text-[#007ACC]">
          Links (optional)
          <input value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://..." className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100" />
        </label>
        <button type="submit" className="w-full h-10 rounded-lg bg-[#007ACC] text-white text-sm font-medium">Submit application</button>
      </form>
    </div>
  )
}
