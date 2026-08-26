import { useState, useEffect, useRef } from 'react'
import { Camera } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsCard,
  SettingsInput,
  SettingsField,
  SETTINGS_TEXTAREA,
  SettingsButton,
} from './SettingsTemplates'

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
      <SettingsPageHeader
        title="Account"
        subtitle="Name, photo, and bio. Changes save as you type."
      />

      <SettingsSection title="Profile">
        <SettingsCard>
          <div className="space-y-4">
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
            <SettingsInput
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <SettingsField label="Handle">
              <div className="mt-1 flex items-center">
                <span className="h-10 flex items-center px-3 rounded-l-lg border border-r-0 border-zinc-800 bg-[#121218] text-sm text-zinc-500">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/\s/g, '').toLowerCase())}
                  className="h-10 flex-1 rounded-r-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100"
                />
              </div>
            </SettingsField>
            <SettingsField label="Bio" hint={`${bio.length}/280`}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 280))}
                rows={3}
                maxLength={280}
                className={SETTINGS_TEXTAREA}
              />
            </SettingsField>
            <SettingsInput label="Email" value={user?.email || ''} readOnly />
            {err ? <p className="text-sm text-red-400">{err}</p> : null}
            <p className="text-[11px] text-zinc-500">{busy ? 'Saving…' : 'Saved as you type.'}</p>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsButton variant="link" onClick={() => onNavigate?.('channel')}>
        Open Channel page
      </SettingsButton>
    </div>
  )
}
