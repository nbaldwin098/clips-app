import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  getSubscriberCount,
  getCreatorAnalytics,
  getCreatorRanking,
  listEmotes,
  addEmote,
  PREMIUM_PRICE,
} from '../lib/engagement'
import { useState } from 'react'

export default function ChannelPage({ onNavigate }) {
  const { user, updateProfile } = useAuth()
  const a = getCreatorAnalytics(user?.id)
  const rank = getCreatorRanking(user?.id)
  const [code, setCode] = useState('')
  const [emotes, setEmotes] = useState(() => listEmotes(user?.id))

  const add = (e) => {
    e.preventDefault()
    if (!code.trim() || user?.creatorStatus !== 'approved') return
    const list = addEmote(user.id, { code: code.trim() })
    setEmotes([...list])
    setCode('')
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <PageHeader title="Channel" onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-[#007ACC]/25 text-[#007ACC] flex items-center justify-center text-xl font-bold">
            {(user?.displayName || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-zinc-100 font-medium">{user?.displayName}</p>
            <p className="text-xs text-zinc-500">@{user?.handle}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-[#0b0b0f] border border-zinc-800 p-2">
            <p className="text-[#007ACC] font-semibold">{getSubscriberCount(user?.id)}</p>
            <p className="text-zinc-500">Subs</p>
          </div>
          <div className="rounded-lg bg-[#0b0b0f] border border-zinc-800 p-2">
            <p className="text-[#007ACC] font-semibold">{a.views}</p>
            <p className="text-zinc-500">Views</p>
          </div>
          <div className="rounded-lg bg-[#0b0b0f] border border-zinc-800 p-2">
            <p className="text-[#007ACC] font-semibold">{rank ? `#${rank}` : '—'}</p>
            <p className="text-zinc-500">Rank</p>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Premium membership for fans: fixed <span className="text-[#007ACC]">${PREMIUM_PRICE}/mo</span> (not customizable).
        </p>
        {user?.creatorStatus === 'approved' && (
          <div>
            <p className="text-xs text-[#007ACC] mb-2">Subscriber emotes</p>
            <form onSubmit={add} className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="emoteCode" className="flex-1 h-9 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100" />
              <button type="submit" className="h-9 px-3 rounded-lg bg-[#007ACC] text-white text-xs">Add</button>
            </form>
            <div className="flex flex-wrap gap-2 mt-2">
              {emotes.map((em) => (
                <span key={em.id} className="text-xs px-2 py-1 rounded-md border border-zinc-700 text-zinc-300">:{em.code}:</span>
              ))}
            </div>
          </div>
        )}
        <label className="block text-xs text-[#007ACC]">
          Bio
          <textarea defaultValue={user?.bio || ''} onBlur={(e) => updateProfile({ bio: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 py-2 text-sm text-zinc-100" />
        </label>
      </div>
    </div>
  )
}
