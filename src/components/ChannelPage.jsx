import { useState, useRef, useEffect } from 'react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  getSubscriberCount, getCreatorAnalytics, getCreatorRanking,
  listEmotes, addEmote, getMembershipPrice, setMembershipPrice,
} from '../lib/engagement'
import { Camera } from 'lucide-react'
import { copyShareUrl } from '../lib/routes'

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

export default function ChannelPage({ onNavigate }) {
  const { user, saveProfile } = useAuth()
  const a = getCreatorAnalytics(user?.id)
  const rank = getCreatorRanking(user?.id)
  const [code, setCode] = useState('')
  const [price, setPrice] = useState(() => getMembershipPrice(user?.id))
  const [emotes, setEmotes] = useState(() => listEmotes(user?.id))
  const bannerRef = useRef(null)
  const avatarRef = useRef(null)

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [handle, setHandle] = useState(user?.handle || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarDraft, setAvatarDraft] = useState(null)
  const [bannerDraft, setBannerDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

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

  const cancel = () => {
    setDisplayName(user?.displayName || '')
    setHandle(user?.handle || '')
    setBio(user?.bio || '')
    setAvatarDraft(null)
    setBannerDraft(null)
    setErr('')
    if (user?.id) setPrice(getMembershipPrice(user.id))
  }

  const save = async () => {
    setErr('')
    setBusy(true)
    try {
      await saveProfile(
        { displayName: displayName.trim(), handle, bio: bio.slice(0, 280) },
        { avatar: avatarDraft, banner: bannerDraft },
      )
      if (user?.id) setPrice(setMembershipPrice(user.id, price))
      setAvatarDraft(null)
      setBannerDraft(null)
    } catch (e) {
      setErr(e.message || 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  const avatarSrc = avatarDraft || user?.avatarUrl
  const bannerSrc = bannerDraft || user?.bannerUrl

  const add = (e) => {
    e.preventDefault()
    if (!code.trim() || user?.creatorStatus !== 'approved') return
    const list = addEmote(user.id, { code: code.trim() })
    setEmotes([...list])
    setCode('')
  }

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="px-4 pt-4">
        <PageHeader title="Channel" onBack={() => onNavigate?.('home')} />
      </div>

      <div className="relative mx-4 h-36 sm:h-44 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
        {bannerSrc ? <img src={bannerSrc} alt="" className="h-full w-full object-cover" /> : null}
        <button
          type="button"
          onClick={() => bannerRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/35 transition-colors"
        >
          <span className="h-9 px-3 rounded-lg bg-black/70 border border-white/20 text-xs text-white flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Change banner
          </span>
        </button>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          readImage(f, 1280, setBannerDraft)
        }} />
      </div>

      <div className="px-4 sm:px-6 -mt-10 relative flex flex-col sm:flex-row sm:items-end gap-4">
        <button
          type="button"
          onClick={() => avatarRef.current?.click()}
          className="relative h-24 w-24 rounded-full border-4 border-black bg-[#121218] overflow-hidden shrink-0 group"
          title="Change profile picture"
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl font-bold text-white">
              {(displayName || '?')[0].toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
            <Camera className="h-6 w-6" />
          </span>
        </button>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          readImage(f, 512, setAvatarDraft)
        }} />
        <div className="flex-1 pb-1 min-w-0">
          <h2 className="text-xl font-semibold text-zinc-100 truncate">{displayName || user?.displayName}</h2>
          <p className="text-sm text-zinc-500">@{handle || user?.handle}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {getSubscriberCount(user?.id)} subscribers
            {rank ? ` · Rank #${rank}` : ''}
            {user?.creatorStatus === 'approved' ? ' · Creator' : ''}
          </p>
          <button
            type="button"
            className="mt-2 h-8 px-3 rounded-lg bg-white text-black text-xs font-semibold"
            onClick={async () => {
              if (!user?.handle) return
              await copyShareUrl('profile', user.handle)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? 'Copied' : 'Copy public profile link'}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 mt-6 grid sm:grid-cols-4 gap-2 text-center text-xs">
        {[['Views', a.views], ['Clips', a.clips], ['Watch hrs', a.watchHours], ['Subs', a.subscribers]].map(([label, val]) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-[#121218] p-3">
            <p className="text-white font-semibold text-lg">{val}</p>
            <p className="text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-6 mt-6 space-y-4 pb-24">
        <label className="block text-xs text-white">
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#121218] px-3 text-sm text-zinc-100" />
        </label>
        <label className="block text-xs text-white">
          Handle
          <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s/g, '').toLowerCase())} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#121218] px-3 text-sm text-zinc-100" />
        </label>
        <label className="block text-xs text-white">
          Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} maxLength={280} placeholder="Tell viewers about your channel" className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#121218] px-3 py-2 text-sm text-zinc-100" />
        </label>
        <label className="block text-xs text-white">
          Membership list price (USD / month)
          <input
            type="number"
            min="1"
            max="50"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-32 h-9 rounded-lg border border-zinc-800 bg-[#121218] px-3 text-sm text-zinc-100"
          />
          <span className="block mt-1 text-zinc-500 font-normal">
            Checkout shows this number. Payouts are not live yet.
          </span>
        </label>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        {user?.creatorStatus === 'approved' && (
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4">
            <p className="text-xs text-white mb-2">Subscriber emotes</p>
            <form onSubmit={add} className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="emoteCode" className="flex-1 h-9 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100" />
              <button type="submit" className="h-9 px-3 rounded-lg bg-white text-black text-xs">Add</button>
            </form>
            <div className="flex flex-wrap gap-2 mt-2">
              {emotes.map((em) => (
                <span key={em.id} className="text-xs px-2 py-1 rounded-md border border-zinc-700 text-zinc-300">:{em.code}:</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {dirty ? (
        <div className="sticky bottom-0 z-20 border-t border-zinc-800 bg-black px-4 py-3 flex gap-2 justify-end">
          <button type="button" onClick={cancel} className="h-10 px-4 rounded-lg border border-zinc-700 text-sm text-zinc-200">Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="h-10 px-4 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
