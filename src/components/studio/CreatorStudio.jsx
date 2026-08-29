import { useMemo, useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  BarChart3,
  CircleDollarSign,
  BadgeCheck,
  Settings,
  Play,
  Trash2,
  Clapperboard,
  Share2,
  SlidersHorizontal,
  Film,
  Image as ImageIcon,
  Radio,
  FolderOpen,
  ShoppingBag,
  Search,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { lsGet, lsSet } from '../../lib/storage'
import { liveBadgeLabel } from '../../lib/liveStatus'
import { getCreatorContent, deleteCatalogItem, setContentVisibility } from '../../lib/contentService'
import {
  getViews,
  getVotes,
  getSubscriberCount,
  getCreatorAnalytics,
} from '../../lib/engagement'
import { creatorBalance } from '../../lib/payouts'
import { listVods, setVodVisibility, getVodChannel } from '../../lib/vods'
import {
  getLinkedVodAccount,
  startVodAccountLink,
  confirmVodAccountLink,
  unlinkVodAccount,
} from '../../lib/vodAccountLink'
import { buildInteractionNetwork, listCreatorInteractions } from '../../lib/creatorInteractions'
import { formatCount } from '../../lib/uiFormat'
import { formatPostedAt, postedAtOf } from '../../lib/mediaMeta'
import { cn } from '../../lib/utils'
import { useContentSyncTick, useInteractionSyncTick } from '../../lib/useContentSync'
import ChannelAvatar from '../ChannelAvatar'
import NotificationsMenu from '../NotificationsMenu'
import { listWithdrawMethods } from '../../lib/calabiCash'
import InteractionBubbleMap from './InteractionBubbleMap'
import StudioRealtimeAnalytics from './StudioRealtimeAnalytics'
import CreatorEarningsPanel from './CreatorEarningsPanel'
import StudioSocialsPanel from './StudioSocialsPanel'
import CreatorLab from './CreatorLab'
import StreamSettings from '../settings/StreamSettings'
import { CREATOR_PAGES } from '../settings/creatorSettingPages'
import { CREATOR_SETTING_PAGES } from '../settings/SettingsLayout'
import VerifyPage from '../VerifyPage'
import SellerPortal from '../SellerPortal'
import {
  getIdVerificationForUser,
  isVerifiedChannel,
} from '../../lib/verification'
import { isOfficialCreator } from '../../lib/uiFormat'
import { listNewspaper } from '../../lib/newspaper'
import {
  SettingsCard,
  SettingsKpiGrid,
  SettingsButton,
  SettingsNotice,
} from '../settings/SettingsTemplates'
import { DashToneProvider } from '../dash/StudioShell'
import StudioControlDeck from './StudioControlDeck'

const STUDIO_NAV = [
  { id: 'overview', label: 'Home', icon: LayoutDashboard, group: 'Studio' },
  { id: 'lab', label: 'Calabi Studio', icon: Clapperboard, group: 'Studio' },
  { id: 'content', label: 'Content', icon: FolderOpen, group: 'Studio' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Studio' },
  { id: 'socials', label: 'Community', icon: Share2, group: 'Studio' },
  { id: 'earnings', label: 'Monetization', icon: CircleDollarSign, group: 'Money' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, group: 'Money' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Account' },
  { id: 'verify', label: 'Get verified', icon: BadgeCheck, group: 'Account' },
]

function typeLabel(type) {
  if (type === 'video') return 'Video'
  if (type === 'pic') return 'Pic'
  return 'Clip'
}

function groupNav(items) {
  const groups = []
  for (const item of items) {
    const name = item.group || 'Studio'
    const last = groups[groups.length - 1]
    if (!last || last.name !== name) groups.push({ name, items: [item] })
    else last.items.push(item)
  }
  return groups
}

function dayKey(ms) {
  const d = new Date(ms)
  if (!Number.isFinite(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Last N days of views / followers / posts for overview charts. */
function buildOverviewSeries(creatorId, posts, days = 14) {
  const keys = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    keys.push(dayKey(d.getTime()))
  }
  const views = Object.fromEntries(keys.map((k) => [k, 0]))
  const followers = Object.fromEntries(keys.map((k) => [k, 0]))
  const postCounts = Object.fromEntries(keys.map((k) => [k, 0]))

  for (const p of posts || []) {
    const at = Date.parse(postedAtOf(p) || p.createdAt || p.publishedAt || '')
    const k = dayKey(at)
    if (k && postCounts[k] != null) {
      postCounts[k] += 1
      views[k] += getViews(p.id) || 0
    }
  }

  const events = listCreatorInteractions(creatorId, { range: '30d', limit: 2000, includeSubscribe: true }) || []
  for (const ev of events) {
    if (ev.type !== 'subscribe') continue
    const t = Date.parse(ev.at)
    const k = dayKey(t)
    if (k && followers[k] != null) followers[k] += 1
  }

  return {
    keys,
    views: keys.map((k) => ({ day: k.slice(5), value: views[k] })),
    followers: keys.map((k) => ({ day: k.slice(5), value: followers[k] })),
    posts: keys.map((k) => ({ day: k.slice(5), value: postCounts[k] })),
  }
}

function PostRow({ post, active, deleting, onSelect, onPlay, onDelete, onVisibility }) {
  const views = getViews(post.id)
  const likes = getVotes(post.id)?.up || 0
  const vis = post.visibility === 'private' || post.status === 'draft' ? 'private' : (post.visibility || 'public')
  return (
    <div
      className={cn(
        'border border-white/10 bg-[#141414] p-3 text-left transition-colors rounded-xl',
        active ? 'border-white/40' : 'hover:border-white/20'
      )}
    >
      <button type="button" onClick={() => onSelect(post.id)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{typeLabel(post.type)}</p>
            <p className="text-sm font-semibold text-zinc-100 truncate mt-0.5">{post.title || 'Untitled'}</p>
          </div>
          <span className="shrink-0 text-[10px] text-zinc-500">{formatPostedAt(postedAtOf(post)) || '—'}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-zinc-500">
          <span>{formatCount(views)} views</span>
          <span>·</span>
          <span>{formatCount(likes)} likes</span>
          <span>·</span>
          <span>{vis}</span>
        </div>
      </button>
      <div className="mt-2 flex gap-1">
        <button
          type="button"
          onClick={() => onPlay(post)}
          className="h-8 flex-1 inline-flex items-center justify-center gap-1.5 border border-white/10 text-xs text-zinc-100 hover:bg-white hover:text-black rounded-lg"
        >
          <Play className="h-3.5 w-3.5" /> Open
        </button>
        {onVisibility ? (
          <select
            value={vis}
            onChange={(e) => onVisibility(post, e.target.value)}
            className="h-8 border border-white/10 bg-black px-1 text-[10px] text-zinc-100 rounded-lg"
            title="Visibility"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete(post)}
          disabled={deleting}
          className="h-8 px-3 inline-flex items-center justify-center border border-red-900/60 text-xs text-red-300 hover:bg-red-950 disabled:opacity-50"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function VodsPanel({ user }) {
  const [, bump] = useState(0)
  const vods = listVods(user?.id)
  const ch = getVodChannel(user?.id)
  const clips = useMemo(
    () => (getCreatorContent(user?.id, user?.handle) || []).filter((p) => p.type === 'short'),
    [user?.id, user?.handle, bump]
  )
  const [linkEmail, setLinkEmail] = useState('')
  const [linkCode, setLinkCode] = useState('')
  const [linkNote, setLinkNote] = useState('')
  const [demoCode, setDemoCode] = useState('')
  const linked = getLinkedVodAccount(user?.id)

  const onSendCode = async () => {
    const res = await startVodAccountLink(user?.id, linkEmail)
    setLinkNote(res.message || res.error || '')
    setDemoCode(res.demoCode || '')
    bump((n) => n + 1)
  }

  const onConfirmLink = () => {
    const res = confirmVodAccountLink(user?.id, linkCode, user)
    setLinkNote(res.message || res.error || '')
    if (res.ok) {
      setLinkCode('')
      setDemoCode('')
    }
    bump((n) => n + 1)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsNotice>
        <p>
          Lives end into this library. Creator clips and your clips are kept here too.
          {ch.enabled
            ? ` Second channel @${ch.handle || '—'} is ${ch.autoPublish ? 'auto-posting' : 'manual'}.`
            : ' Link a second account below to publish VODs on a separate channel.'}
        </p>
      </SettingsNotice>

      <SettingsCard title="Link second account" description="Verify the email on that login with a code.">
        {linked ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-white">
              Linked @{linked.handle || linked.email}
            </p>
            <SettingsButton
              variant="ghost"
              onClick={() => {
                unlinkVodAccount(user?.id)
                bump((n) => n + 1)
              }}
            >
              Unlink
            </SettingsButton>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              placeholder="Second account email"
              className="h-9 w-full border border-zinc-800 bg-black px-2 text-xs text-white"
            />
            <div className="flex flex-wrap gap-2">
              <SettingsButton onClick={onSendCode}>Send code</SettingsButton>
              <input
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className="h-9 w-28 border border-zinc-800 bg-black px-2 text-xs text-white"
              />
              <SettingsButton onClick={onConfirmLink}>Verify & link</SettingsButton>
            </div>
            {demoCode ? <p className="text-[11px] text-zinc-500">Demo code (mail not wired): {demoCode}</p> : null}
            {linkNote ? <p className="text-xs text-amber-400">{linkNote}</p> : null}
          </div>
        )}
      </SettingsCard>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-zinc-600">Lives & VODs</p>
        {vods.filter((v) => v.kind !== 'clip').length === 0 ? (
          <p className="text-sm text-zinc-500">No lives ended yet.</p>
        ) : vods.filter((v) => v.kind !== 'clip').map((v) => (
          <SettingsCard key={v.id} title={v.title || 'Past broadcast'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-zinc-500">
                {v.endedAt?.slice(0, 16).replace('T', ' ')} · {Math.round((v.durationSec || 0) / 60)} min
              </p>
              <select
                value={v.visibility}
                onChange={(e) => { setVodVisibility(v.id, e.target.value); bump((n) => n + 1) }}
                className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
          </SettingsCard>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-zinc-600">Clips in library</p>
        {clips.length === 0 && vods.filter((v) => v.kind === 'clip').length === 0 ? (
          <p className="text-sm text-zinc-500">No clips yet.</p>
        ) : (
          <>
            {clips.map((c) => (
              <SettingsCard key={c.id} title={c.title || 'Clip'}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-zinc-500">
                    Clip · {c.visibility || 'public'} · {Math.round((c.durationSec || 0))}s
                  </p>
                  <select
                    value={c.visibility === 'private' || c.status === 'draft' ? 'private' : 'public'}
                    onChange={(e) => {
                      setContentVisibility(c.id, e.target.value, user)
                      bump((n) => n + 1)
                    }}
                    className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </SettingsCard>
            ))}
            {vods.filter((v) => v.kind === 'clip').map((v) => (
              <SettingsCard key={v.id} title={v.title || 'Clip'}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-zinc-500">Saved clip record</p>
                  <select
                    value={v.visibility}
                    onChange={(e) => { setVodVisibility(v.id, e.target.value); bump((n) => n + 1) }}
                    className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </SettingsCard>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function StudioControls({ onNavigate, approved }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onNavigate?.('dashboard', 'earnings')}
        className="h-9 px-3 border border-zinc-700 text-xs text-zinc-300 hover:border-white hover:text-white"
      >
        Earnings
      </button>
      {!approved ? (
        <button
          type="button"
          onClick={() => onNavigate?.('creator-apply')}
          className="h-9 px-3 border border-zinc-700 text-xs text-zinc-400 hover:border-white hover:text-white"
        >
          Apply to earn
        </button>
      ) : null}
    </div>
  )
}

function StudioSettingsPanel({ onNavigate, initialPage = 'chat', pages, PageMap }) {
  const list = pages || []
  const [page, setPage] = useState(list.some((p) => p.id === initialPage) ? initialPage : (list[0]?.id || 'chat'))
  useEffect(() => {
    if (list.some((p) => p.id === initialPage)) setPage(initialPage)
    else if (list[0]?.id) setPage(list[0].id)
  }, [initialPage, list])
  const Page = (PageMap && PageMap[page]) || null
  return (
    <div className="h-full min-h-0 overflow-y-auto max-w-3xl space-y-4">
      <label className="block max-w-xs">
        <span className="sr-only">Creator settings section</span>
        <select
          value={page}
          onChange={(e) => setPage(e.target.value)}
          className="w-full h-10 border border-zinc-700 bg-[#0c0c10] px-3 text-sm text-white"
        >
          {list.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>
      {Page ? <Page onNavigate={onNavigate} /> : null}
    </div>
  )
}

function ContentLibrary({
  user,
  posts,
  onPlayItem,
  onOpenUpload,
  onNavigate,
  onDeletePost,
  deletingId,
  onVisibility,
}) {
  const [filter, setFilter] = useState('all')
  const vods = useMemo(() => listVods(user?.id), [user?.id])
  const news = useMemo(
    () => listNewspaper(80).filter((n) => n.authorId === user?.id || n.userId === user?.id),
    [user?.id]
  )

  const rows = useMemo(() => {
    const media = (posts || []).map((p) => ({
      id: p.id,
      kind: p.type === 'pic' ? 'pic' : p.type === 'video' ? 'video' : 'clip',
      title: p.title || 'Untitled',
      at: postedAtOf(p) || p.createdAt,
      raw: p,
    }))
    const vodRows = (vods || []).map((v) => ({
      id: v.id,
      kind: 'vod',
      title: v.title || 'VOD',
      at: v.createdAt || v.endedAt,
      raw: v,
    }))
    const newsRows = news.map((n) => ({
      id: n.id,
      kind: 'news',
      title: String(n.body || '').trim().slice(0, 80) || 'News post',
      at: n.publishedAt || n.createdAt,
      raw: n,
    }))
    const all = [...media, ...vodRows, ...newsRows].sort(
      (a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0)
    )
    if (filter === 'all') return all
    return all.filter((r) => r.kind === filter)
  }, [posts, vods, news, filter])

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'video', label: 'Videos' },
    { id: 'clip', label: 'Clips' },
    { id: 'pic', label: 'Pics' },
    { id: 'vod', label: 'VODs' },
    { id: 'news', label: 'News' },
  ]

  const openRow = (row) => {
    if (row.kind === 'news') {
      onNavigate?.('news')
      return
    }
    if (row.kind === 'vod') {
      onNavigate?.('vods')
      return
    }
    onPlayItem?.(row.raw)
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto space-y-4 max-w-3xl">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpenUpload?.('video')}
          className="h-8 px-3 border border-white/10 text-[11px] text-zinc-200 hover:border-white/40 rounded-lg"
        >
          Upload video
        </button>
        <button
          type="button"
          onClick={() => onOpenUpload?.('short')}
          className="h-8 px-3 border border-white/10 text-[11px] text-zinc-200 hover:border-white/40 rounded-lg"
        >
          Upload clip
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('create')}
          className="h-8 px-3 border border-white/10 text-[11px] text-zinc-200 hover:border-white/40 rounded-lg"
        >
          Post pic
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('news')}
          className="h-8 px-3 border border-white/10 text-[11px] text-zinc-200 hover:border-white/40 rounded-lg"
        >
          News
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={cn(
              'h-7 px-2.5 text-[11px] font-semibold',
              filter === t.id ? 'bg-white text-black' : 'bg-white/10 text-zinc-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {rows.length === 0 ? (
          <li className="text-sm text-zinc-500 py-8 text-center">No content yet.</li>
        ) : rows.map((row) => (
          <li key={`${row.kind}_${row.id}`} className="border border-white/10 bg-[#141414] p-3 rounded-xl">
            <button type="button" onClick={() => openRow(row)} className="w-full text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {row.kind === 'clip' ? 'Clip' : row.kind === 'pic' ? 'Pic' : row.kind === 'vod' ? 'VOD' : row.kind === 'news' ? 'News' : 'Video'}
                  </p>
                  <p className="text-sm font-semibold text-zinc-100 truncate mt-0.5">{row.title}</p>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-500">{formatPostedAt(row.at) || '—'}</span>
              </div>
            </button>
            {row.kind !== 'news' && row.kind !== 'vod' ? (
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => openRow(row)}
                  className="h-8 flex-1 inline-flex items-center justify-center gap-1.5 border border-white/10 text-xs text-zinc-100 hover:bg-white hover:text-black rounded-lg"
                >
                  <Play className="h-3.5 w-3.5" /> Open
                </button>
                {onVisibility ? (
                  <select
                    value={row.raw.visibility === 'private' || row.raw.status === 'draft' ? 'private' : (row.raw.visibility || 'public')}
                    onChange={(e) => onVisibility(row.raw, e.target.value)}
                    className="h-8 border border-white/10 bg-black px-1 text-[10px] text-zinc-100 rounded-lg"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                ) : null}
                {onDeletePost ? (
                  <button
                    type="button"
                    onClick={() => onDeletePost(row.raw)}
                    disabled={deletingId === row.id}
                    className="h-8 px-3 border border-red-900/60 text-xs text-red-300 hover:bg-red-950 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MakePostPanel({ onOpenUpload, onNavigate, compact = false }) {
  return (
    <div className={cn(compact ? 'space-y-4' : 'max-w-2xl space-y-8 py-4')}>
      <div>
        <h2 className={cn('font-semibold text-white tracking-tight', compact ? 'text-lg' : 'text-2xl')}>
          {compact ? 'Make a post' : 'Calabi Studio'}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          Upload your own video, clip, or pic — then edit, go live, or post to socials below.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Video', hint: 'Long-form', Icon: Film, action: () => onOpenUpload?.('video') },
          { label: 'Clip', hint: 'Vertical short', Icon: Clapperboard, action: () => onOpenUpload?.('short') },
          { label: 'Pic', hint: 'Photo post', Icon: ImageIcon, action: () => onNavigate?.('create') },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.action}
            className="text-left border border-zinc-700 bg-[#0e0e14] p-4 hover:border-white transition-colors"
          >
            <card.Icon className="h-5 w-5 text-white mb-3" />
            <p className="text-sm font-semibold text-white">{card.label}</p>
            <p className="mt-1 text-xs text-zinc-500">{card.hint}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CreatorStudio({
  onOpenUpload,
  onNavigate,
  onPlayItem,
  onOpenAuth,
  initialSection = 'overview',
  initialSettingsPage = 'chat',
}) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const interactionTick = useInteractionSyncTick()
  const [section, setSection] = useState(() => {
    const raw = initialSection && initialSection !== 'overview'
      ? initialSection
      : (lsGet('calabi_studio_section', initialSection) || initialSection)
    return raw === 'post' ? 'lab' : raw
  })
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [range, setRange] = useState('all')
  const [postFilter, setPostFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const [cloudSyncBusy, setCloudSyncBusy] = useState(false)
  const [untilMs, setUntilMs] = useState(null)
  const [labTool, setLabTool] = useState(null) // 'controls' | 'stream' | null
  const [mapTick, setMapTick] = useState(0)
  const [studioQuery, setStudioQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)

  // Debounce analytics map rebuilds so 12s sync ticks do not remount the bubble.
  useEffect(() => {
    const t = setTimeout(() => setMapTick(interactionTick + syncTick), 900)
    return () => clearTimeout(t)
  }, [interactionTick, syncTick])

  const refreshAudienceFromCloud = async () => {
    if (!user?.id || user.provider !== 'supabase') return
    setCloudSyncBusy(true)
    try {
      const { syncCreatorInteractionsFromCloud, syncGraphFromCloud } = await import('../../lib/graphSync')
      await syncGraphFromCloud?.().catch(() => {})
      await syncCreatorInteractionsFromCloud?.().catch(() => {})
      const ids = getCreatorContent(user.id, user.handle).map((p) => p.id).filter(Boolean)
      if (ids.length) {
        const { pullViewCounts } = await import('../../lib/economySync')
        await pullViewCounts(ids).catch(() => {})
      }
    } finally {
      setCloudSyncBusy(false)
    }
  }

  useEffect(() => {
    if (!initialSection) return
    if (initialSection === 'wallet') setSection('earnings')
    else if (initialSection === 'post') setSection('lab')
    else setSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    lsSet('calabi_studio_section', section)
  }, [section])

  // Legacy nav targets fold into Calabi Studio / Content.
  useEffect(() => {
    if (section === 'controls' || section === 'stream' || section === 'post') {
      setSection('lab')
      if (section === 'controls') setLabTool('controls')
      if (section === 'stream') setLabTool('stream')
    } else if (section === 'vods') {
      setSection('content')
    }
  }, [section])

  useEffect(() => {
    if (!user?.id || user.provider !== 'supabase') return undefined
    let cancelled = false
    const sync = () => {
      import('../../lib/graphSync').then(async ({ syncCreatorInteractionsFromCloud, syncGraphFromCloud }) => {
        if (cancelled) return
        try {
          await syncGraphFromCloud?.()
        } catch {}
        try {
          await syncCreatorInteractionsFromCloud?.()
        } catch {}
      }).catch(() => {})
      const ids = getCreatorContent(user.id, user.handle).map((p) => p.id).filter(Boolean)
      if (ids.length) {
        import('../../lib/economySync').then(({ pullViewCounts }) => {
          if (cancelled) return
          pullViewCounts(ids).catch(() => {})
        }).catch(() => {})
      }
    }
    sync()
    const t = setInterval(sync, section === 'analytics' ? 12000 : 20000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [user?.id, user?.provider, user?.handle, section])

  const posts = useMemo(() => getCreatorContent(user?.id, user?.handle), [user?.id, user?.handle, syncTick])
  const overviewSeries = useMemo(
    () => buildOverviewSeries(user?.id, posts, 14),
    [user?.id, posts, syncTick, mapTick]
  )
  const live = lsGet(`live_state_${user?.id}`, null)
  const views = posts.reduce((n, c) => n + getViews(c.id), 0)
  const likes = posts.reduce((n, c) => n + (getVotes(c.id)?.up || 0), 0)
  const followers = getSubscriberCount(user?.id)
  const analytics = getCreatorAnalytics(user?.id)
  const premiumSubs = Number(analytics?.premiumSubs) || 0
  const approved = user?.creatorStatus === 'approved'
  const balance = creatorBalance(user?.id, user?.handle)
  const vods = listVods(user?.id)
  const verified = isOfficialCreator(user?.id, user?.handle) || isVerifiedChannel(user?.id, user?.handle)
  const hasPayout = (listWithdrawMethods(user?.id) || []).length > 0
  const recentActivity = useMemo(
    () => listCreatorInteractions(user?.id, { range: '7d', limit: 12, includeSubscribe: true }),
    [user?.id, mapTick, syncTick]
  )
  const verifyStatus = getIdVerificationForUser(user?.id)?.status
  const navGroups = groupNav(STUDIO_NAV)
  const showPostsColumn = section === 'analytics'

  const filteredPosts = useMemo(() => {
    if (postFilter === 'all') return posts
    if (postFilter === 'video') return posts.filter((p) => p.type === 'video')
    if (postFilter === 'clip') return posts.filter((p) => p.type === 'short')
    if (postFilter === 'pic') return posts.filter((p) => p.type === 'pic')
    return posts
  }, [posts, postFilter])

  const selectedPost = posts.find((p) => p.id === selectedPostId) || null
  const postStartMs = selectedPost
    ? (Date.parse(postedAtOf(selectedPost) || selectedPost.createdAt || selectedPost.publishedAt || '') || null)
    : null

  // Analytics requires a post — auto-pick the newest when entering the section.
  useEffect(() => {
    if (section !== 'analytics') return
    if (selectedPostId && posts.some((p) => p.id === selectedPostId)) return
    if (posts[0]?.id) setSelectedPostId(posts[0].id)
  }, [section, posts, selectedPostId])

  useEffect(() => {
    setUntilMs(null)
  }, [selectedPostId])

  const network = useMemo(
    () => buildInteractionNetwork(user?.id, posts, {
      contentId: selectedPostId,
      range: 'all',
      untilMs: untilMs ?? Date.now(),
      sinceMs: postStartMs || undefined,
    }),
    // mapTick is debounced — avoid rebuilding the bubble on every sync pulse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, posts, selectedPostId, untilMs, postStartMs, mapTick]
  )

  const openPost = (c) => {
    if (onPlayItem) onPlayItem(c)
    else if (c?.type === 'pic') onNavigate?.('pics', c.id)
    else if (c?.type === 'short') onNavigate?.('clips', c.id)
    else if (c?.id) onNavigate?.('watch', c.id)
  }

  const onDeletePost = async (post) => {
    if (!post?.id || !user?.id || deletingId) return
    const label = post.title?.trim() || 'Untitled'
    if (!window.confirm(`Delete "${label}"? This removes it everywhere and cannot be undone.`)) return
    setDeletingId(post.id)
    try {
      await deleteCatalogItem(post.id, user, { intentional: true })
      if (selectedPostId === post.id) setSelectedPostId(null)
    } finally {
      setDeletingId(null)
    }
  }

  const goNav = (item) => {
    if (item?.href) {
      onNavigate?.(item.href)
      return
    }
    if (item?.id) setSection(item.id)
  }

  const searchHits = useMemo(() => {
    const needle = studioQuery.trim().toLowerCase()
    if (!needle) return []
    return posts.filter((p) => String(p.title || '').toLowerCase().includes(needle)).slice(0, 8)
  }, [studioQuery, posts])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const liveOn = Boolean(live?.isLive || live?.live)

  return (
    <DashToneProvider tone="dark">
    <div className="h-full min-h-[480px] flex flex-col bg-[#0b0b0b] text-zinc-200 overflow-hidden" data-studio="calabi">
      <header className="shrink-0 h-14 px-3 sm:px-4 flex items-center gap-3 border-b border-white/10 bg-[#0b0b0b]">
        <div className="flex-1 max-w-xl mx-auto relative">
          <div className="flex items-center gap-2 h-9 rounded-full border border-white/10 bg-[#141414] px-3">
            <Search className="h-4 w-4 text-zinc-500 shrink-0" />
            <input
              ref={searchRef}
              type="search"
              value={studioQuery}
              onChange={(e) => { setStudioQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Search your posts"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-white placeholder:text-zinc-500 outline-none"
              aria-label="Search your posts"
            />
          </div>
          {searchOpen && studioQuery.trim() ? (
            <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-white/10 bg-[#141414] py-1 z-30 shadow-xl">
              {searchHits.length ? searchHits.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setSearchOpen(false); setStudioQuery(''); openPost(p) }}
                  className="w-full text-left px-3 py-2 text-[13px] text-zinc-200 hover:bg-white/5 truncate"
                >
                  {p.title || 'Untitled'}
                </button>
              )) : (
                <p className="px-3 py-2 text-[12px] text-zinc-500">No posts match. This search is your dashboard only.</p>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <NotificationsMenu
            onNavigate={onNavigate}
            onOpenWatch={(id) => onNavigate?.('watch', id)}
            onOpenAuth={onOpenAuth}
          />
          <span className="relative ml-1">
            <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={32} />
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#0b0b0b]"
              style={{ background: liveOn ? '#ffffff' : '#52525b' }}
            />
          </span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
      <aside className="hidden sm:flex w-[240px] shrink-0 border-r border-white/10 bg-[#0b0b0b] flex-col">
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Creator Dashboard</p>
        </div>
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
          {navGroups.map((g) => (
            <div key={g.name}>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = item.icon
                  const active = !item.href && section === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goNav(item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium text-left rounded-xl',
                        active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => onNavigate?.('home')}
            className="w-full h-9 px-3 rounded-lg border border-white/15 text-[13px] font-semibold text-white inline-flex items-center gap-2 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to calabi
          </button>
        </div>
        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2.5">
          <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-white truncate">{user?.displayName || user?.handle || 'You'}</p>
            <p className="text-[11px]" style={{ color: liveOn ? '#ffffff' : '#71717a' }}>
              {liveOn ? 'Online' : 'Offline'}
            </p>
          </div>
          <MoreVertical className="h-4 w-4 text-zinc-500 shrink-0" />
        </div>
      </aside>

      {/* Mobile section picker */}
      <div className="sm:hidden absolute top-0 left-0 right-0 z-10 border-b border-white/10 bg-[#0b0b0b] px-3 py-2">
        <select
          value={section}
          onChange={(e) => {
            const item = STUDIO_NAV.find((s) => s.id === e.target.value)
            goNav(item || { id: e.target.value })
          }}
          className="w-full h-9 border border-white/10 bg-black px-2 text-sm text-zinc-100 rounded-lg"
        >
          {STUDIO_NAV.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Posts column — only where it helps */}
      {showPostsColumn ? (
        <section className="w-[280px] max-w-[40vw] shrink-0 border-r border-white/10 flex flex-col min-h-0 bg-[#0e0e12] max-sm:hidden">
          <div className="shrink-0 px-3 py-3 border-b border-white/10 space-y-2">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Your posts</p>
              <p className="text-[11px] text-zinc-500">Select one to filter the map</p>
            </div>
            <div className="flex gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'video', label: 'Videos' },
                { id: 'clip', label: 'Clips' },
                { id: 'pic', label: 'Pics' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPostFilter(t.id)}
                  className={cn(
                    'h-7 px-2 text-[11px] font-semibold rounded',
                    postFilter === t.id ? 'bg-white text-black' : 'bg-white/10 text-zinc-400'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
            {filteredPosts.length === 0 ? (
              <p className="p-3 text-xs text-zinc-500">No posts yet.</p>
            ) : filteredPosts.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                active={selectedPostId === post.id}
                deleting={deletingId === post.id}
                onSelect={setSelectedPostId}
                onPlay={openPost}
                onDelete={onDeletePost}
                onVisibility={(p, vis) => {
                  setContentVisibility(p.id, vis, user)
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Main workspace */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col max-sm:pt-12 bg-black">
        <div className="flex-1 min-h-0 overflow-hidden px-5 md:px-6 py-5">
          {section === 'overview' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <StudioControlDeck
                user={user}
                views={views}
                followers={followers}
                premiumSubs={premiumSubs}
                posts={posts}
                series={overviewSeries}
                interactions={recentActivity}
                live={live}
                hasPayout={hasPayout}
                verified={verified}
                onGoLive={() => setSection('lab')}
                onOpenUpload={onOpenUpload}
                onOpenAnalytics={() => setSection('analytics')}
                onOpenContent={() => setSection('content')}
                onOpenEarnings={() => setSection('earnings')}
                onOpenPost={openPost}
                onOpenAuth={onOpenAuth}
              />
            </div>
          ) : null}

          {section === 'post' || section === 'lab' || section === 'controls' || section === 'stream' ? (
            <div className="h-full overflow-y-auto space-y-6">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setLabTool((t) => (t === 'controls' ? null : 'controls'))}
                  className={cn(
                    'h-8 px-2.5 text-[11px] font-semibold border inline-flex items-center gap-1.5',
                    labTool === 'controls' ? 'border-white text-white bg-white/10' : 'border-white/10 text-zinc-400 hover:text-white'
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Controls
                </button>
                <button
                  type="button"
                  onClick={() => setLabTool((t) => (t === 'stream' ? null : 'stream'))}
                  className={cn(
                    'h-8 px-2.5 text-[11px] font-semibold border inline-flex items-center gap-1.5',
                    labTool === 'stream' ? 'border-white text-white bg-white/10' : 'border-white/10 text-zinc-400 hover:text-white'
                  )}
                >
                  <Radio className="h-3.5 w-3.5" /> Stream
                </button>
              </div>
              {labTool === 'controls' ? (
                <StudioControls
                  onNavigate={onNavigate}
                  approved={approved}
                />
              ) : null}
              {labTool === 'stream' ? (
                <div className="max-w-2xl border border-white/10 bg-[#141414] p-4 rounded-xl">
                  <StreamSettings />
                </div>
              ) : null}
              <MakePostPanel onOpenUpload={onOpenUpload} onNavigate={onNavigate} compact />
              <div className="border-t border-white/10 pt-6">
                <CreatorLab onNavigate={onNavigate} onOpenAuth={onOpenAuth} compact />
              </div>
            </div>
          ) : null}

          {section === 'content' || section === 'vods' ? (
            <ContentLibrary
              user={user}
              posts={posts}
              onPlayItem={onPlayItem}
              onOpenUpload={onOpenUpload}
              onNavigate={onNavigate}
              onDeletePost={onDeletePost}
              deletingId={deletingId}
              onVisibility={(p, vis) => setContentVisibility(p.id, vis, user)}
            />
          ) : null}

          {section === 'analytics' ? (
            <div className="h-full min-h-0 overflow-y-auto space-y-4 pr-1">
              <SettingsKpiGrid
                columns={3}
                items={[
                  { label: 'Posts', value: String(posts.length) },
                  { label: 'Views', value: formatCount(views) },
                  { label: 'Likes', value: formatCount(likes) },
                  { label: 'Followers', value: formatCount(followers), hint: `${formatCount(premiumSubs)} premium` },
                  { label: 'VODs', value: String(vods.length) },
                  { label: 'Status', value: liveBadgeLabel(live), hint: approved ? `$${balance.paid.toFixed(2)} paid` : 'Apply to earn' },
                ]}
              />
              <div className="h-[min(78vh,820px)] min-h-[520px] overflow-hidden rounded-xl border border-zinc-800">
                <InteractionBubbleMap
                  network={network}
                  selectedPostId={selectedPostId}
                  selectedPost={selectedPost}
                  onSelectPost={setSelectedPostId}
                  postTitle={selectedPost?.title}
                  creator={user}
                  untilMs={untilMs}
                  onUntilChange={setUntilMs}
                  postStartMs={postStartMs}
                />
              </div>
              <div className="min-h-[180px] border border-zinc-800">
                <StudioRealtimeAnalytics
                  creatorId={user?.id}
                  posts={posts}
                  selectedPost={selectedPost}
                  onSelectPost={setSelectedPostId}
                  range={range}
                  onRangeChange={setRange}
                  tick={mapTick}
                  untilMs={untilMs}
                  forcePostTab
                />
              </div>
            </div>
          ) : null}

          {section === 'socials' ? (
            <div className="h-full overflow-hidden">
              <StudioSocialsPanel onNavigate={onNavigate} />
            </div>
          ) : null}

          {section === 'earnings' ? (
            <div className="h-full overflow-hidden">
              <CreatorEarningsPanel />
            </div>
          ) : null}

          {section === 'shop' ? (
            <div className="h-full overflow-y-auto">
              <SellerPortal onOpenAuth={onOpenAuth} onNavigate={onNavigate} />
            </div>
          ) : null}

          {section === 'settings' ? (
            <StudioSettingsPanel
              onNavigate={onNavigate}
              initialPage={initialSettingsPage}
              pages={CREATOR_SETTING_PAGES}
              PageMap={CREATOR_PAGES}
            />
          ) : null}

          {section === 'verify' ? (
            <div className="h-full overflow-y-auto max-w-xl">
              <VerifyPage onOpenAuth={onOpenAuth} onNavigate={onNavigate} />
            </div>
          ) : null}
        </div>
      </main>
      </div>
    </div>
    </DashToneProvider>
  )
}
