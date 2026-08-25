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

const field = 'mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100'

export default function AccountSettings({ onNavigate }) {
  const { user, saveProfile } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [handle, setHandle] = useState(user?.handle || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarDraft, setAvatarDraft] = useState(null)
  const [bannerDraft, setBannerDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const avatarRef = useRef(null)
  const bannerRef = useRef(null)

  useEffect(() => {
    setDisplayName(user?.displayName || '')
    setHandle(user?.handle || '')
    setBio(user?.bio || '')
  }, [user?.id, user?.displayName, user?.handle, user?.bio])

  const dirty = Boolean(
    avatarDraft
    || bannerDraft
    || displayName !== (user?.displayName || '')
    || handle !== (user?.handle || '')
    || bio !== (user?.bio || '')
  )

  const save = async () => {
    if (!user) return
    setErr('')
    setBusy(true)
    try {
      await saveProfile(
        { displayName: displayName.trim(), handle, bio: bio.slice(0, 280) },
        { avatar: avatarDraft, banner: bannerDraft },
      )
      setAvatarDraft(null)
      setBannerDraft(null)
    } catch (e) {
      setErr(e.message || 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!dirty || !user) return
    const t = setTimeout(() => { save() }, 600)
    return () => clearTimeout(t)
  }, [dirty, displayName, handle, bio, avatarDraft, bannerDraft, user?.id])

  const avatarSrc = avatarDraft || user?.avatarUrl
  const bannerSrc = bannerDraft || user?.bannerUrl

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-xl font-semibold text-white">Account</h1>
        <p className="mt-1 text-sm text-zinc-500">Name, photo, and bio. Changes save as you type.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Profile</h2>
        <div className="flex gap-4 items-start">
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            className="relative h-20 w-20 rounded-full bg-[#121218] border border-zinc-800 overflow-hidden shrink-0"
            title="Change profile picture"
          >
            {avatarSrc ? <img src={avatarSrc} alt="" className="h-full w-full object-cover" /> : (
              <span className="flex h-full items-center justify-center text-white">{displayName?.[0]?.toUpperCase() || '?'}</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
              <Camera className="h-5 w-5" />
            </span>
          </button>
          <button type="button" onClick={() => bannerRef.current?.click()} className="flex-1 h-20 rounded-xl bg-[#121218] border border-zinc-800 overflow-hidden relative">
            {bannerSrc ? <img src={bannerSrc} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-zinc-500 flex items-center justify-center h-full">Banner</span>}
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs">Change banner</span>
          </button>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          readImage(f, 512, setAvatarDraft)
        }} />
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          readImage(f, 1280, setBannerDraft)
        }} />
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
              className="h-10 flex-1 rounded-r-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} maxLength={280} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#000000] px-3 py-2 text-sm text-zinc-100" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Email</span>
          <input value={user?.email || ''} readOnly className={`${field} text-zinc-400`} />
        </label>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        <p className="text-[11px] text-zinc-500">{busy ? 'Saving…' : 'Saved as you type.'}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Ads</h2>
        <p className="text-xs text-zinc-500">calabi runs ads by default. Turn this off to hide ads on this account — saved to your profile, not this browser only.</p>
        <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3 cursor-pointer">
          <span className="text-sm text-zinc-200">Show ads while I browse</span>
          <input
            type="checkbox"
            checked={user?.showAds !== false}
            disabled={busy || user?.provider !== 'supabase'}
            onChange={async (e) => {
              setErr('')
              setBusy(true)
              try {
                await saveProfile({ showAds: e.target.checked })
              } catch (ex) {
                setErr(ex.message || 'Could not save ad preference.')
              } finally {
                setBusy(false)
              }
            }}
            className="rounded bg-[#1a1a24] border-zinc-700 text-white focus:ring-0"
          />
        </label>
        {user?.provider !== 'supabase' ? (
          <p className="text-[11px] text-zinc-600">Sign in with a calabi account to sync this preference.</p>
        ) : null}
      </section>

      <button type="button" onClick={() => onNavigate?.('channel')} className="text-xs text-white underline">Open Channel page</button>
    </div>
  )
}
