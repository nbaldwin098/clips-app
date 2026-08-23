import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getApplicationForUser, submitCreatorApplication } from '../lib/moderation'
import { notifyApplicationSubmitted } from '../lib/notifications'
import { ORG, applicationsAreOpen, applicationsWindowLabel } from '../lib/orgConfig'

const inputCls =
  'mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100 placeholder:text-zinc-600'

export default function CreatorApplyPage({ onOpenAuth }) {
  const { user, isAuthenticated, updateProfile } = useAuth()
  const existing = user ? getApplicationForUser(user.id) : null
  const [name, setName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bio, setBio] = useState('')
  const [social, setSocial] = useState(['', '', '', ''])
  const [category, setCategory] = useState('gaming')
  const [done, setDone] = useState(false)
  const open = applicationsAreOpen()

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto text-sm text-zinc-400">
        <button type="button" onClick={onOpenAuth} className="text-white font-medium">Sign in</button> to apply.
      </div>
    )
  }

  if (user.creatorStatus === 'approved') {
    return (
      <div className="p-6 max-w-md mx-auto rounded-2xl border border-zinc-800 bg-[#121218] text-sm text-zinc-200">
        You are an approved creator. Studio and live tools are unlocked.
      </div>
    )
  }

  if (existing?.status === 'pending' || user.creatorStatus === 'pending' || done) {
    return (
      <div className="p-6 max-w-md mx-auto rounded-2xl border border-zinc-800 bg-[#121218] text-sm text-zinc-200">
        Application pending. We may contact you at the email or phone you provided ({ORG.supportEmail} for questions).
      </div>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    const links = social.map((s) => s.trim()).filter(Boolean).slice(0, 4)
    submitCreatorApplication({
      userId: user.id,
      handle: user.handle,
      name: name.trim().slice(0, 80),
      displayName: name.trim().slice(0, 80),
      email: email.trim().slice(0, 120),
      phone: phone.trim().slice(0, 32),
      address: address.trim().slice(0, 160),
      bio: bio.trim().slice(0, 280),
      about: bio.trim().slice(0, 280),
      links,
      category,
    })
    updateProfile({
      creatorStatus: 'pending',
      displayName: name.trim().slice(0, 80) || user.displayName,
    })
    notifyApplicationSubmitted(user.id, user.handle)
    setDone(true)
  }

  const setLink = (i, v) => {
    setSocial((prev) => {
      const next = [...prev]
      next[i] = v
      return next
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-white">Apply to create</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-3">Short form so we can review and reach you.</p>

      <div className={`mb-4 rounded-xl border px-4 py-3 text-xs ${
        open ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-200' : 'border-zinc-800 bg-[#121218] text-zinc-400'
      }`}>
        {open ? (
          <>
            <p className="font-medium text-emerald-100">Applications open</p>
            <p className="mt-1">{ORG.applicationsOpenMessage}</p>
            <p className="mt-1 text-emerald-200/70">Window: {applicationsWindowLabel()}</p>
          </>
        ) : (
          <>
            <p className="font-medium text-zinc-200">Limited open window ended</p>
            <p className="mt-1">You can still apply; reviews run as normal. Window was {applicationsWindowLabel()}.</p>
          </>
        )}
      </div>

      {existing?.status === 'rejected' && (
        <p className="mb-4 text-sm text-zinc-200 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3">
          Your last application was not approved. Update the form and submit again for another review.
        </p>
      )}
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-800 bg-[#121218] p-5">
        <label className="block text-xs text-white">Full name
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={80} />
        </label>
        <label className="block text-xs text-white">Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} maxLength={120} />
        </label>
        <label className="block text-xs text-white">Phone
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} maxLength={32} placeholder="+1…" />
        </label>
        <label className="block text-xs text-white">Address
          <input required value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} maxLength={160} placeholder="City, State / Region" />
        </label>
        <label className="block text-xs text-white">Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="gaming">Gaming</option>
            <option value="irl">IRL</option>
            <option value="music">Music</option>
            <option value="education">Education</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-xs text-white">Bio — Tell us about yourself
          <textarea required value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={280} placeholder="Who you are and what you’ll post (280 chars)" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600" />
        </label>
        <div>
          <p className="text-xs text-white mb-1">Social links (up to 4)</p>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <input key={i} value={social[i]} onChange={(e) => setLink(i, e.target.value)} className={inputCls} placeholder={`https://… (${i + 1})`} maxLength={120} />
            ))}
          </div>
        </div>
        <button type="submit" className="w-full h-10 rounded-lg bg-white text-black text-sm font-medium">Submit application</button>
      </form>
    </div>
  )
}
