import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { saveUserSettings, getUserSettings } from '../../lib/storage'

export default function AccountSettings() {
  const { user, updateProfile } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [handle, setHandle] = useState(user?.handle || '')
  const [email, setEmail] = useState(user?.email || '')
  const [bio, setBio] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setHandle(user.handle || '')
      setEmail(user.email || '')
    }
    const settings = getUserSettings()
    if (settings.bio) setBio(settings.bio)
  }, [user])

  const save = () => {
    updateProfile({
      displayName: displayName.trim() || user?.displayName,
      handle: handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || user?.handle,
      email: email.trim() || user?.email,
    })
    saveUserSettings({ bio: bio.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Account</h1>
        <p className="mt-1 text-sm text-slate-500">Public profile and login email. Changes save to this device until backend auth is connected.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        <div className="grid gap-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Display name</span>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Handle</span>
            <div className="mt-1 flex items-center">
              <span className="h-10 flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-sm text-slate-500">@</span>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value.replace(/\s/g, '').toLowerCase())}
                className="h-10 flex-1 rounded-r-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Bio</span>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
              placeholder="Short description for your channel"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C729B]/30 focus:border-[#2C729B]"
            />
          </label>
        </div>
        <button
          onClick={save}
          className="h-9 px-4 rounded-lg bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82] transition-colors"
        >
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Avatar & Banner</h2>
        <div className="flex gap-4">
          <div className="h-20 w-20 rounded-full bg-[#EBF4FA] border border-slate-200 flex items-center justify-center text-xs font-medium text-[#2C729B]">
            {displayName?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 h-20 rounded-xl bg-[#EBF4FA] border border-slate-200 flex items-center justify-center text-xs text-slate-500">
            Banner upload (client crop → object storage)
          </div>
        </div>
      </section>
    </div>
  )
}
