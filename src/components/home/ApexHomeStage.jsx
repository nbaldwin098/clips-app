import { useEffect, useState } from 'react'
import { Heart, Gift, Smile } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ChannelAvatar from '../ChannelAvatar'
import VerifiedBadge from '../VerifiedBadge'
import { isOfficialCreator } from '../../lib/uiFormat'
import { isVerifiedChannel } from '../../lib/verification'
import { liveBadgeLabel, isOnAir } from '../../lib/liveStatus'
import { listIndexedUsers } from '../../lib/moderation'
import { isSubscribed, toggleSubscribe } from '../../lib/engagement'
import { trySendLiveChat } from '../../lib/liveChat'
import { subscribeLiveChat, resolveLiveChatChannelId, GLOBAL_LIVE_CHANNEL_ID } from '../../lib/liveChatSync'
import { cn } from '../../lib/utils'

const LIVE = '#eb0400'
function lookupUser(id) {
  if (!id) return null
  return (listIndexedUsers() || []).find((u) => u.id === id) || null
}

function LiveThumb({ stream, className = '' }) {
  const src = stream?.thumbUrl || stream?.previewUrl || stream?.avatarUrl || ''
  if (!src) return <div className={cn('bg-[#141414]', className)} />
  return <img src={src} alt="" className={cn('object-cover', className)} />
}

export default function ApexHomeStage({
  onAir = [],
  onNavigate,
  onOpenProfile,
  onOpenAuth,
  onOpenCheckout,
  onSelectLive,
}) {
  const { user, isAuthenticated } = useAuth()
  const featured = onAir[0] || null
  const [draft, setDraft] = useState('')
  const [chat, setChat] = useState([])
  const [note, setNote] = useState('')
  const [, bump] = useState(0)

  const channelId = featured?.userId || GLOBAL_LIVE_CHANNEL_ID
  const followed = featured && user?.id ? isSubscribed(user.id, featured.userId) : false
  const official = featured
    ? isOfficialCreator(featured.userId, featured.handle) || isVerifiedChannel(featured.userId, featured.handle)
    : false
  const liveOn = featured ? isOnAir(featured) : false
  const badge = featured ? liveBadgeLabel(featured) : ''
  const name = featured?.displayName || featured?.handle || ''
  const title = featured?.title || ''
  const shownChat = chat

  useEffect(() => {
    return subscribeLiveChat(resolveLiveChatChannelId(channelId), (list) => {
      setChat(Array.isArray(list) ? list.slice(-40) : [])
    })
  }, [channelId])

  const onFollow = () => {
    if (!featured?.userId) return
    if (!isAuthenticated) { onOpenAuth?.(); return }
    toggleSubscribe(user.id, featured.userId)
    bump((n) => n + 1)
  }

  const onGift = () => {
    if (!featured?.userId) return
    if (!isAuthenticated) { onOpenAuth?.(); return }
    onOpenCheckout?.(featured.userId, featured.handle)
  }

  const onSend = (e) => {
    e?.preventDefault?.()
    if (!isAuthenticated) { onOpenAuth?.(); return }
    const text = draft.trim()
    if (!text) return
    const res = trySendLiveChat(channelId, {
      text,
      userId: user.id,
      handle: user.handle || user.displayName,
    }, { actor: user })
    if (!res.ok) {
      setNote(res.error || 'Could not send.')
      return
    }
    setDraft('')
    setNote('')
  }

  const openLive = (stream) => {
    if (stream) onSelectLive?.(stream)
    else onNavigate?.('live')
  }

  return (
    <div className="w-full bg-black" data-home="apex">
      <section className="px-5 md:px-8 pt-4">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] border border-white/10 bg-[#0a0a0a]">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => openLive(featured)}
              className="relative block w-full aspect-video bg-black text-left"
            >
              {featured ? (
                <LiveThumb stream={featured} className="absolute inset-0 h-full w-full" />
              ) : (
                <div className="absolute inset-0 bg-[#111]" />
              )}
              {featured ? (
                <span
                  className="absolute left-2 top-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: liveOn ? LIVE : '#3f3f46' }}
                >
                  {badge}
                </span>
              ) : null}
            </button>
            {featured ? (
              <div className="flex items-start gap-3 p-3">
                <button
                  type="button"
                  onClick={() => onOpenProfile?.(featured.handle, featured.userId)}
                  className="shrink-0"
                >
                  <ChannelAvatar src={featured.avatarUrl || lookupUser(featured.userId)?.avatarUrl} name={name} size={40} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white truncate">{title || 'Live'}</p>
                  <p className="text-[12px] text-[#b3b3b3] truncate inline-flex items-center gap-1">
                    {name}
                    {official ? <VerifiedBadge className="h-3.5 w-3.5 bg-white text-black" /> : null}
                  </p>
                  {featured.category ? <p className="text-[12px] text-[#8a8a8a]">{featured.category}</p> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={onFollow}
                    className="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-semibold bg-white text-black"
                  >
                    <Heart className="h-3.5 w-3.5" fill={followed ? 'black' : 'none'} />
                    {followed ? 'Following' : 'Follow'}
                  </button>
                  <button
                    type="button"
                    onClick={onGift}
                    className="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white border border-white/20"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    Gift
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm text-[#8a8a8a]">Nobody is live</p>
              </div>
            )}
          </div>

          <aside className="flex flex-col border-t lg:border-t-0 lg:border-l border-white/10 min-h-[240px]">
            <p className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a] border-b border-white/10">Chat</p>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5">
              {shownChat.length ? shownChat.map((m) => (
                <p key={m.id || `${m.at}-${m.userId}`} className="text-[13px] leading-snug text-[#e4e4e7]">
                  <span className="font-semibold text-white">{m.handle || 'User'}</span>
                  <span className="text-[#cfcfcf]"> {m.text || m.body || ''}</span>
                </p>
              )) : (
                <p className="text-[13px] text-[#6b6b6b]">No messages yet.</p>
              )}
            </div>
            <form onSubmit={onSend} className="p-2 border-t border-white/10">
              <div className="flex items-center gap-2 h-9 px-2 bg-[#141414] border border-white/10">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Send a message"
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-white placeholder:text-[#6b6b6b] outline-none"
                />
                <Smile className="h-4 w-4 text-[#6b6b6b] shrink-0" />
              </div>
              {note ? <p className="mt-1 text-[11px] text-rose-400">{note}</p> : null}
            </form>
          </aside>
        </div>
      </section>

      <section className="px-5 md:px-8 pt-8 pb-2">
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="text-[17px] font-semibold text-white">Live</h2>
          <button type="button" onClick={() => onNavigate?.('live')} className="text-[13px] text-[#8a8a8a] hover:text-white">
            View all
          </button>
        </div>
        {onAir.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
            {onAir.slice(1, 10).map((s) => {
              const nm = s.displayName || s.handle || 'Creator'
              const ok = isOfficialCreator(s.userId, s.handle) || isVerifiedChannel(s.userId, s.handle)
              return (
                <button
                  key={s.userId}
                  type="button"
                  onClick={() => openLive(s)}
                  className="w-full text-left"
                >
                  <div className="relative aspect-video overflow-hidden bg-[#141414]">
                    <LiveThumb stream={s} className="absolute inset-0 h-full w-full" />
                    <span
                      className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                      style={{ background: isOnAir(s) ? LIVE : '#3f3f46' }}
                    >
                      {liveBadgeLabel(s)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    <ChannelAvatar src={s.avatarUrl || lookupUser(s.userId)?.avatarUrl} name={nm} size={32} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{s.title || 'Live'}</p>
                      <p className="text-[12px] text-[#b3b3b3] truncate inline-flex items-center gap-1">
                        {nm}
                        {ok ? <VerifiedBadge className="h-3 w-3 bg-white text-black" /> : null}
                      </p>
                      {s.category ? <p className="text-[11px] text-[#8a8a8a] truncate">{s.category}</p> : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-[#8a8a8a] py-6">No live channels</p>
        )}
      </section>
    </div>
  )
}
