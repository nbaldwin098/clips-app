import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Heart,
  Gift,
  Home,
  Compass,
  Users,
  Trophy,
  Radio,
  ChevronRight,
  Smile,
  User,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ChannelAvatar from '../ChannelAvatar'
import VerifiedBadge from '../VerifiedBadge'
import { formatCount, isOfficialCreator } from '../../lib/uiFormat'
import { isVerifiedChannel } from '../../lib/verification'
import { liveBadgeLabel, isOnAir } from '../../lib/liveStatus'
import { getStreamSettings } from '../../lib/streamSettings'
import { listIndexedUsers } from '../../lib/moderation'
import { isSubscribed, toggleSubscribe } from '../../lib/engagement'
import { trySendLiveChat } from '../../lib/liveChat'
import { subscribeLiveChat, resolveLiveChatChannelId, GLOBAL_LIVE_CHANNEL_ID } from '../../lib/liveChatSync'
import { cn } from '../../lib/utils'

const ORANGE = '#FF4B11'
const CHAT_COLORS = ['#c4b5fd', '#7dd3fc', '#fb923c', '#86efac', '#f9a8d4', '#fde047']

function colorFor(handle) {
  const s = String(handle || '')
  let n = 0
  for (let i = 0; i < s.length; i += 1) n += s.charCodeAt(i)
  return CHAT_COLORS[n % CHAT_COLORS.length]
}

function lookupUser(id) {
  if (!id) return null
  return (listIndexedUsers() || []).find((u) => u.id === id) || null
}

function streamTags(stream) {
  if (!stream?.userId) return []
  const settings = getStreamSettings(stream.userId)
  const tags = []
  if (stream.category) tags.push(stream.category)
  for (const t of settings.tags || []) {
    if (t && !tags.includes(t)) tags.push(t)
  }
  return tags.slice(0, 3)
}

function streamBio(stream) {
  const u = lookupUser(stream?.userId)
  const bio = String(u?.bio || '').trim()
  return bio.slice(0, 180)
}

function watchersOf(stream) {
  if (!stream) return 0
  if (Array.isArray(stream.watcherIds) && stream.watcherIds.length) return stream.watcherIds.length
  return Number(stream.watchers) || 0
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
  const rail = useRef(null)
  const [draft, setDraft] = useState('')
  const [chat, setChat] = useState([])
  const [note, setNote] = useState('')
  const [, bump] = useState(0)

  const channelId = featured?.userId || GLOBAL_LIVE_CHANNEL_ID
  const followed = featured && user?.id ? isSubscribed(user.id, featured.userId) : false
  const official = featured
    ? isOfficialCreator(featured.userId, featured.handle) || isVerifiedChannel(featured.userId, featured.handle)
    : false
  const tags = useMemo(() => (featured ? streamTags(featured) : []), [featured])
  const bio = featured ? streamBio(featured) : ''
  const watchers = watchersOf(featured)
  const liveOn = featured ? isOnAir(featured) : false
  const badge = featured ? liveBadgeLabel(featured) : ''
  const name = featured?.displayName || featured?.handle || ''
  const title = featured?.title || ''

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

  const dock = [
    { id: 'home', label: 'Home', Icon: Home, go: () => onNavigate?.('home'), active: true },
    { id: 'discover', label: 'Discover', Icon: Compass, go: () => onNavigate?.('explore') },
    { id: 'following', label: 'Following', Icon: Users, go: () => onNavigate?.('following') },
    { id: 'esports', label: 'Esports', Icon: Trophy, go: () => onNavigate?.('live') },
    { id: 'community', label: 'Community', Icon: Users, go: () => onNavigate?.('community') },
  ]

  return (
    <div className="w-full bg-black" data-home="apex">
      <section className="relative min-h-[520px] md:min-h-[580px] overflow-hidden">
        <div className="absolute inset-0">
          {featured ? (
            <LiveThumb stream={featured} className="h-full w-full" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_30%_40%,#2a140c_0%,#050505_55%,#000_100%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        </div>

        <div className="relative z-10 flex min-h-[520px] md:min-h-[580px]">
          <div className="flex-1 min-w-0 flex flex-col px-5 md:px-8 pt-6 pb-28">
            {featured ? (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white rounded-md"
                    style={{ background: liveOn ? ORANGE : '#3f3f46' }}
                  >
                    {badge}
                  </span>
                  <span className="inline-flex items-center gap-1 text-white text-[13px] font-semibold tabular-nums">
                    <User className="h-3.5 w-3.5" />
                    {formatCount(watchers)}
                  </span>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenProfile?.(featured.handle, featured.userId)}
                    className="apex-card rounded-full"
                  >
                    <ChannelAvatar src={featured.avatarUrl || lookupUser(featured.userId)?.avatarUrl} name={name} size={56} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="text-[32px] md:text-[40px] font-extrabold tracking-tight text-white leading-none truncate">
                        {name}
                      </h1>
                      {official ? <VerifiedBadge className="h-5 w-5 bg-[#FF4B11] text-white" /> : null}
                    </div>
                    {title ? (
                      <p className="mt-2 text-[18px] font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <Trophy className="h-4 w-4 shrink-0" style={{ color: ORANGE }} />
                        <span className="truncate">{title}</span>
                      </p>
                    ) : null}
                    {featured.category ? (
                      <p className="mt-1 text-[13px] text-[#a0a0a0]">{featured.category}</p>
                    ) : null}
                  </div>
                </div>

                {tags.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-[#1a1a1a] text-[12px] text-[#cfcfcf]">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {bio ? <p className="mt-4 max-w-xl text-[14px] text-white/90 leading-relaxed">{bio}</p> : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onFollow}
                    className="apex-pill h-11 px-6 inline-flex items-center gap-2 text-[14px] font-semibold text-white"
                    style={{ background: ORANGE }}
                  >
                    <Heart className="h-4 w-4" fill={followed ? 'white' : 'none'} />
                    {followed ? 'Following' : 'Follow'}
                  </button>
                  <button
                    type="button"
                    onClick={onGift}
                    className="apex-pill h-11 px-6 inline-flex items-center gap-2 text-[14px] font-semibold text-white border border-white/20 bg-[#1a1a1a]"
                  >
                    <Gift className="h-4 w-4" />
                    Gift Sub
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-16 max-w-lg">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#a0a0a0]">Live</p>
                <h1 className="mt-3 text-[36px] md:text-[44px] font-extrabold tracking-tight text-white leading-none">
                  Nobody is live
                </h1>
                <p className="mt-4 text-[15px] text-[#a0a0a0] leading-relaxed">
                  When a creator goes on-air they land in this hero. Nothing here is invented.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate?.('create')}
                  className="apex-pill mt-6 h-11 px-6 inline-flex items-center gap-2 text-[14px] font-semibold text-white"
                  style={{ background: ORANGE }}
                >
                  <Radio className="h-4 w-4" />
                  Go Live
                </button>
              </div>
            )}
          </div>

          <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-l border-white/10 bg-black/55 backdrop-blur-sm">
            <div className="px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white">Live chat</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-2.5">
              {chat.length ? chat.map((m) => (
                <p key={m.id || `${m.at}-${m.userId}`} className="text-[13px] leading-snug">
                  <span className="font-semibold" style={{ color: colorFor(m.handle) }}>
                    {m.handle || 'User'}
                  </span>
                  <span className="text-white"> {m.text || m.body || ''}</span>
                </p>
              )) : (
                <p className="text-[13px] text-[#8a8a8a]">
                  {featured ? 'Empty until someone chats on this live.' : 'Lobby chat is empty.'}
                </p>
              )}
            </div>
            <form onSubmit={onSend} className="p-3">
              <div className="flex items-center gap-2 h-11 px-3 rounded-full bg-[#1a1a1a] border border-white/10">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-white placeholder:text-[#6b6b6b] outline-none"
                />
                <Smile className="h-4 w-4 text-[#6b6b6b] shrink-0" />
              </div>
              {note ? <p className="mt-1 px-1 text-[11px] text-rose-400">{note}</p> : null}
            </form>
          </aside>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(720px,calc(100%-2rem))]">
          <div className="apex-pill flex items-center gap-1 px-2 py-1.5 bg-[#1a1a1a]/90 border border-white/10 backdrop-blur-md">
            {dock.map((item) => {
              const Icon = item.Icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.go}
                  className={cn(
                    'apex-pill flex-1 h-10 px-2 inline-flex flex-col items-center justify-center gap-0.5',
                    item.active ? 'text-[#FF4B11]' : 'text-[#cfcfcf] hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-semibold hidden sm:block">{item.label}</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => onNavigate?.('create')}
              className="apex-pill h-10 px-4 shrink-0 inline-flex items-center gap-1.5 text-[13px] font-bold text-white"
              style={{ background: ORANGE }}
            >
              <Radio className="h-4 w-4" />
              Go Live
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 md:px-8 pt-6 pb-2">
        <div className="flex items-end justify-between gap-3 mb-4">
          <h2 className="text-[22px] font-extrabold text-white">Live Channels</h2>
          <button type="button" onClick={() => onNavigate?.('live')} className="text-[13px] text-[#a0a0a0] hover:text-white">
            View All
          </button>
        </div>
        {onAir.length ? (
          <div className="relative">
            <div ref={rail} className="flex gap-4 overflow-x-auto pb-3 chip-scroll">
              {onAir.map((s) => {
                const nm = s.displayName || s.handle || 'Creator'
                const ok = isOfficialCreator(s.userId, s.handle) || isVerifiedChannel(s.userId, s.handle)
                return (
                  <button
                    key={s.userId}
                    type="button"
                    onClick={() => openLive(s)}
                    className="apex-card w-[220px] shrink-0 text-left"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-[#141414]">
                      <LiveThumb stream={s} className="absolute inset-0 h-full w-full" />
                      <span
                        className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-white rounded"
                        style={{ background: isOnAir(s) ? ORANGE : '#3f3f46' }}
                      >
                        {liveBadgeLabel(s)}
                      </span>
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold inline-flex items-center gap-1 tabular-nums">
                        <User className="h-3 w-3" />
                        {formatCount(watchersOf(s))}
                      </span>
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <ChannelAvatar src={s.avatarUrl || lookupUser(s.userId)?.avatarUrl} name={nm} size={28} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-white truncate inline-flex items-center gap-1">
                          {nm}
                          {ok ? <VerifiedBadge className="h-3 w-3 bg-[#FF4B11] text-white" /> : null}
                        </p>
                        <p className="text-[12px] text-white/90 truncate">{s.title || 'Live'}</p>
                        {s.category ? <p className="text-[11px] text-[#8a8a8a] uppercase tracking-wide truncate">{s.category}</p> : null}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {onAir.length > 3 ? (
              <button
                type="button"
                aria-label="More live channels"
                onClick={() => rail.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="apex-pill absolute right-0 top-[38%] -translate-y-1/2 h-10 w-10 hidden md:inline-flex items-center justify-center bg-[#1a1a1a] border border-white/15 text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a] px-5 py-10 text-center">
            <p className="text-sm font-semibold text-white">No live channels</p>
            <p className="mt-1 text-sm text-[#8a8a8a]">They appear from ingest. Nothing is invented here.</p>
          </div>
        )}
      </section>
    </div>
  )
}
