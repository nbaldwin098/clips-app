import { useState, useEffect, useRef } from 'react'
import { Camera } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function readImage(file, maxW, cb) {
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      cb(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

const field = 'mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100'

export default function AccountSettings({ onNavigate }) {
  const { user, updateProfile } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [handle, setHandle] = useState(user?.handle || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const avatarRef = useRef(null)
  const bannerRef = useRef(null)

  useEffect(() => {
    setDisplayName(user?.displayName || '')
    setHandle(user?.handle || '')
    setBio(user?.bio || '')
  }, [user])

  const save = () => {
    setErr('')
    try {
      updateProfile({
        displayName: displayName.trim() || user?.displayName,
        handle: handle.trim(),
        bio: bio.slice(0, 280),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErr(e.message || 'Could not save.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Account</h1>
        <p className="mt-1 text-sm text-zinc-500">Name, handle, and bio show on your public profile. Avatar and banner also live on Channel.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Profile</h2>
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Display name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Handle</span>
          <div className="mt-1 flex items-center">
            <span className="h-10 flex items-center px-3 rounded-l-lg border border-r-0 border-zinc-800 bg-[#121218] text-sm text-zinc-500">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/\s/g, '').toLowerCase())}
              className="h-10 flex-1 rounded-r-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} maxLength={280} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 py-2 text-sm text-zinc-100" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Email</span>
          <input value={user?.email || ''} readOnly className={`${field} text-zinc-400`} />
          <span className="mt-1 block text-[11px] text-zinc-500">Login email cannot be edited here. Sign in with a different email to use another inbox.</span>
        </label>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        <button type="button" onClick={save} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Avatar & banner</h2>
        <p className="text-xs text-zinc-500">Same files as Channel. They stay on this device unless your account is already synced.</p>
        <div className="flex gap-4 items-stretch">
          <button type="button" onClick={() => avatarRef.current?.click()} className="relative h-20 w-20 rounded-full bg-[#121218] border border-zinc-800 overflow-hidden">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (
              <span className="flex h-full items-center justify-center text-white">{displayName?.[0]?.toUpperCase() || '?'}</span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white py-0.5 flex items-center justify-center gap-1"><Camera className="h-3 w-3" /> Photo</span>
          </button>
          <button type="button" onClick={() => bannerRef.current?.click()} className="flex-1 h-20 rounded-xl bg-[#121218] border border-zinc-800 overflow-hidden relative">
            {user?.bannerUrl ? <img src={user.bannerUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-zinc-500 flex items-center justify-center h-full">Banner</span>}
          </button>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], 256, (data) => updateProfile({ avatarUrl: data }))} />
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], 1280, (data) => updateProfile({ bannerUrl: data }))} />
        <button type="button" onClick={() => onNavigate?.('channel')} className="text-xs text-white underline">Open Channel page</button>
      </section>
    </div>
  )
}
