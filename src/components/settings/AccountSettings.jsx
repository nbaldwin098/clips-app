import { useState, useEffect, useRef } from 'react'
import { Camera } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getLocale, setLocale, listLocales, t, subscribeLocale } from '../../lib/i18n'
import {
  SettingsSection,
  SettingsCard,
  SettingsInput,
  SettingsField,
  SettingsSelect,
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
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [locale, setLocaleState] = useState(() => getLocale())
  const avatarRef = useRef(null)

  useEffect(() => {
    setDisplayName(user?.displayName || '')
    setHandle(user?.handle || '')
    setBio(user?.bio || '')
  }, [user?.id, user?.displayName, user?.handle, user?.bio])

  useEffect(() => subscribeLocale(setLocaleState), [])

  const dirty = Boolean(
    avatarDraft
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
        { avatar: avatarDraft },
      )
      setAvatarDraft(null)
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
  }, [dirty, displayName, handle, bio, avatarDraft, user?.id])

  const avatarSrc = avatarDraft || user?.avatarUrl

  return (
    <div className="space-y-8 pb-20">
      <p className="text-sm text-neutral-500">Name, photo, and bio. Changes save as you type.</p>

      <SettingsSection title="Profile">
        <SettingsCard>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="relative h-28 w-28 rounded-full bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0"
                title="Change profile picture"
              >
                {avatarSrc ? <img src={avatarSrc} alt="" className="h-full w-full object-cover" /> : (
                  <span className="flex h-full items-center justify-center text-2xl text-neutral-700">{displayName?.[0]?.toUpperCase() || '?'}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
                  <Camera className="h-5 w-5" />
                </span>
              </button>
              <div className="text-center sm:text-left pt-1">
                <p className="text-sm text-neutral-900 font-medium">Profile picture</p>
                <p className="text-xs text-neutral-500 mt-1">Shown on your channel and posts. No banners.</p>
                <button type="button" onClick={() => avatarRef.current?.click()} className="mt-2 text-xs text-neutral-600 underline">
                  Change photo
                </button>
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              readImage(f, 512, setAvatarDraft)
            }} />
            <SettingsInput
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <SettingsField label="Handle">
              <div className="mt-1 flex items-center">
                <span className="h-10 flex items-center px-3 rounded-l-lg border border-r-0 border-neutral-200 bg-neutral-50 text-sm text-neutral-500">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/\s/g, '').toLowerCase())}
                  className="h-10 flex-1 rounded-r-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
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
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <p className="text-[11px] text-neutral-500">{busy ? 'Saving…' : 'Saved as you type.'}</p>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('i18n.language')} description={t('i18n.hint')} divider>
        <SettingsCard>
          <SettingsSelect
            label={t('i18n.language')}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            {listLocales().map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </SettingsSelect>
        </SettingsCard>
      </SettingsSection>

      <SettingsButton variant="link" onClick={() => onNavigate?.('channel')}>
        Open Channel page
      </SettingsButton>
    </div>
  )
}
