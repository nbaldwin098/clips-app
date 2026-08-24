import { useState, useRef } from 'react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  getSubscriberCount, getCreatorAnalytics, getCreatorRanking,
  listEmotes, addEmote, getMembershipPrice, setMembershipPrice,
} from '../lib/engagement'
import { Camera } from 'lucide-react'

export default function ChannelPage({ onNavigate }) {
  const { user, updateProfile } = useAuth()
  const a = getCreatorAnalytics(user?.id)
  const rank = getCreatorRanking(user?.id)
  const [code, setCode] = useState('')
  const [price, setPrice] = useState(() => getMembershipPrice(user?.id))
  const [emotes, setEmotes] = useState(() => listEmotes(user?.id))
  const bannerRef = useRef(null)
  const avatarRef = useRef(null)

  const readImage = (file, maxW, cb) => {
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
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        cb(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const onBanner = (e) => {
    const f = e.target.files?.[0]
    readImage(f, 1280, (data) => updateProfile({ bannerUrl: data }))
  }
  const onAvatar = (e) => {
    const f = e.target.files?.[0]
    readImage(f, 256, (data) => updateProfile({ avatarUrl: data }))
  }

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

      <div className="relative mx-4 h-36 sm:h-44 rounded-xl overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-800 to-white/30 border border-zinc-800">
        {user?.bannerUrl ? <img src={user.bannerUrl} alt="" className="h-full w-full object-cover" /> : null}
        <button type="button" onClick={() => bannerRef.current?.click()} className="absolute bottom-2 right-2 h-8 px-3 rounded-lg bg-black/60 border border-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" /> Banner
        </button>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={onBanner} />
      </div>

      <div className="px-4 sm:px-6 -mt-10 relative flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="relative shrink-0">
          <div className="h-24 w-24 rounded-full border-4 border-[#000000] bg-[#121218] overflow-hidden flex items-center justify-center text-3xl font-bold text-white">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (user?.displayName || '?')[0].toUpperCase()}
          </div>
          <button type="button" onClick={() => avatarRef.current?.click()} className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white text-black flex items-center justify-center border-2 border-[#000000]" title="Change avatar">
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
        </div>
        <div className="flex-1 pb-1 min-w-0">
          <h2 className="text-xl font-semibold text-zinc-100 truncate">{user?.displayName}</h2>
          <p className="text-sm text-zinc-500">@{user?.handle}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {getSubscriberCount(user?.id)} subscribers
            {rank ? ` · Rank #${rank}` : ''}
            {user?.creatorStatus === 'approved' ? ' · Creator' : ''}
          </p>
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

      <div className="px-4 sm:px-6 mt-6 space-y-4 pb-10">
        <label className="block text-xs text-white">
          Bio
          <textarea defaultValue={user?.bio || ''} onBlur={(e) => updateProfile({ bio: e.target.value.slice(0, 280) })} rows={3} maxLength={280} placeholder="Tell viewers about your channel" className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#121218] px-3 py-2 text-sm text-zinc-100" />
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
            onBlur={() => { if (user?.id) setPrice(setMembershipPrice(user.id, price)) }}
            className="mt-1 w-32 h-9 rounded-lg border border-zinc-800 bg-[#121218] px-3 text-sm text-zinc-100"
          />
          <span className="block mt-1 text-zinc-500 font-normal">
            Checkout shows this number. A Stripe Payment Link still has its own price in the Stripe dashboard — match them. Payouts are not live yet.
          </span>
        </label>
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
    </div>
  )
}
