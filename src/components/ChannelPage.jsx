import { useState, useRef, useEffect } from 'react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  getSubscriberCount, getCreatorAnalytics, getCreatorRanking,
  listEmotes, addEmote, getMembershipPrice, setMembershipPrice,
} from '../lib/engagement'
import { Camera } from 'lucide-react'
import { copyShareUrl } from '../lib/routes'
import VerifiedBadge from './VerifiedBadge'
import { isVerifiedChannel } from '../lib/verification'

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
  const avatarRef = useRef(null)

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [handle, setHandle] = useState(user?.handle || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarDraft, setAvatarDraft] = useState(null)
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
    || displayName !== (user?.displayName || '')
    || handle !== (user?.handle || '')
    || bio !== (user?.bio || '')
    || Number(price) !== Number(getMembershipPrice(user?.id))
  )

  const save = async () => {
    setErr('')
    setBusy(true)
    try {
      await saveProfile(
        { displayName: displayName.trim(), handle, bio: bio.slice(0, 280) },
        { avatar: avatarDraft },
      )
      if (user?.id) setPrice(setMembershipPrice(user.id, price))
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
  }, [dirty, displayName, handle, bio, avatarDraft, price, user?.id])

  const avatarSrc = avatarDraft || user?.avatarUrl

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

      <div className="px-4 sm:px-6 mt-4 relative flex flex-col sm:flex-row sm:items-end gap-4">
        <button
          type="button"
          onClick={() => avatarRef.current?.click()}
          className="relative h-28 w-28 rounded-full border-4 border-black bg-[#121218] overflow-hidden shrink-0 group"
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
          <h2 className="text-xl font-semibold text-zinc-100 truncate inline-flex items-center gap-2">
            {displayName || user?.displayName}
            {isVerifiedChannel(user?.id, handle || user?.handle) ? <VerifiedBadge /> : null}
          </h2>
          <p className="text-sm text-zinc-500">@{handle || user?.handle}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {getSubscriberCount(user?.id)} followers
            {rank ? ` · Rank #${rank}` : ''}
            {user?.creatorStatus === 'approved' ? ' · Creator' : ''}
          </p>
          <p className="text-[11px] text-zinc-600 mt-1">Tap the avatar to change your photo. No channel banners.</p>
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
        {[['Views', a.views], ['Clips', a.clips], ['Watch hrs', a.watchHours], ['Followers', a.subscribers]].map(([label, val]) => (
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
        <p className="text-[11px] text-zinc-500">{busy ? 'Saving…' : 'Saved as you type.'}</p>
        {user?.creatorStatus === 'approved' && (
          <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4">
            <p className="text-xs text-white mb-2">Premium emotes</p>
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
    </div>
  )
}
