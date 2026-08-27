import { useMemo, useState, useEffect } from 'react'
import {
  LayoutDashboard,
  BarChart3,
  CircleDollarSign,
  Video,
  BadgeCheck,
  Settings,
  ChevronLeft,
  Play,
  Trash2,
  Clapperboard,
  Share2,
  SlidersHorizontal,
  Film,
  Image as ImageIcon,
  Radio,
  FolderOpen,
  Newspaper,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CreatorOnboarding from '../CreatorOnboarding'
import { lsGet, lsSet } from '../../lib/storage'
import { liveBadgeLabel } from '../../lib/liveStatus'
import { getCreatorContent, deleteCatalogItem, setContentVisibility } from '../../lib/contentService'
import {
  getViews,
  getVotes,
  getSubscriberCount,
  getCreatorAnalytics,
  getMembershipPrice,
  setMembershipPrice,
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

const STUDIO_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Studio' },
  { id: 'lab', label: 'Calabi Studio', icon: Clapperboard, group: 'Studio' },
  { id: 'content', label: 'Content', icon: FolderOpen, group: 'Studio' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Studio' },
  { id: 'socials', label: 'Socials', icon: Share2, group: 'Studio' },
  { id: 'earnings', label: 'Earnings', icon: CircleDollarSign, group: 'Money' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, group: 'Money' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Account' },
  { id: 'verify', label: 'Get verified', icon: BadgeCheck, group: 'Account' },
]

const SECTION_META = {
  overview: { title: 'Creator Studio' },
  lab: { title: 'Calabi Studio' },
  post: { title: 'Calabi Studio' },
  content: { title: 'Content' },
  analytics: { title: 'Analytics' },
  controls: { title: 'Calabi Studio' },
  socials: { title: 'Socials' },
  earnings: { title: 'Earnings' },
  shop: { title: 'Shop' },
  settings: { title: 'Settings' },
  vods: { title: 'Content' },
  stream: { title: 'Calabi Studio' },
  verify: { title: 'Get verified' },
}

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

/** Last N days of views / followers / posts for overview grass bars. */
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
    views: keys.map((k) => ({ day: k.slice(5), value: views[k] })),
    followers: keys.map((k) => ({ day: k.slice(5), value: followers[k] })),
    posts: keys.map((k) => ({ day: k.slice(5), value: postCounts[k] })),
  }
}

function GrassBarChart({ title, series }) {
  const rows = Array.isArray(series) && series.length ? series : [{ day: '—', value: 0 }]
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0))
  return (
    <div className="border border-zinc-800 bg-[#0a0a0e] p-3">
      <p className="text-xs text-zinc-400 mb-3">{title}</p>
      <div className="flex items-end gap-1 h-28">
        {rows.map((r, i) => {
          const h = Math.max(2, ((Number(r.value) || 0) / max) * 100)
          return (
            <div key={`${r.day}-${i}`} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1">
              <div
                className="w-full bg-[#4ade80]"
                style={{ height: `${h}%` }}
                title={`${r.day}: ${r.value}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-2">
        <span>{rows[0]?.day || '—'}</span>
        <span>{rows[rows.length - 1]?.day || '—'}</span>
      </div>
    </div>
  )
}

function OverviewMembershipPrice({ userId }) {
  const [price, setPrice] = useState(() => getMembershipPrice(userId))
  useEffect(() => {
    setPrice(getMembershipPrice(userId))
  }, [userId])
  return (
    <label className="block max-w-xs">
      <span className="text-xs font-medium text-zinc-400">Membership price (USD)</span>
      <input
        type="number"
        min={1}
        max={999}
        step={0.01}
        value={price}
        onChange={(e) => {
          const next = e.target.value
          setPrice(next)
          if (userId) setMembershipPrice(userId, next)
        }}
        className="mt-1 w-full h-10 border border-zinc-800 bg-black px-3 text-sm text-white"
      />
    </label>
  )
}

function PostRow({ post, active, deleting, onSelect, onPlay, onDelete, onVisibility }) {
  const views = getViews(post.id)
  const likes = getVotes(post.id)?.up || 0
  const vis = post.visibility === 'private' || post.status === 'draft' ? 'private' : (post.visibility || 'public')
  return (
    <div
      className={cn(
        'border border-zinc-800 bg-[#0c0c10] p-3 text-left transition-colors',
        active ? 'border-white' : 'hover:border-zinc-600'
      )}
    >
      <button type="button" onClick={() => onSelect(post.id)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{typeLabel(post.type)}</p>
            <p className="text-sm font-semibold text-white truncate mt-0.5">{post.title || 'Untitled'}</p>
          </div>
          <span className="shrink-0 text-[10px] text-zinc-500">{formatPostedAt(postedAtOf(post)) || '—'}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-zinc-400">
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
          className="h-8 flex-1 inline-flex items-center justify-center gap-1.5 border border-zinc-700 text-xs text-white hover:bg-white hover:text-black"
        >
          <Play className="h-3.5 w-3.5" /> Open
        </button>
        {onVisibility ? (
          <select
            value={vis}
            onChange={(e) => onVisibility(post, e.target.value)}
            className="h-8 border border-zinc-700 bg-black px-1 text-[10px] text-white"
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
          className="h-8 px-3 border border-zinc-700 text-[11px] text-zinc-200 hover:border-white"
        >
          Upload video
        </button>
        <button
          type="button"
          onClick={() => onOpenUpload?.('short')}
          className="h-8 px-3 border border-zinc-700 text-[11px] text-zinc-200 hover:border-white"
        >
          Upload clip
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('create')}
          className="h-8 px-3 border border-zinc-700 text-[11px] text-zinc-200 hover:border-white"
        >
          Post pic
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('news')}
          className="h-8 px-3 border border-zinc-700 text-[11px] text-zinc-200 hover:border-white"
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
              filter === t.id ? 'bg-white text-black' : 'bg-[#18181f] text-zinc-400'
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
          <li key={`${row.kind}_${row.id}`} className="border border-zinc-800 bg-[#0c0c10] p-3">
            <button type="button" onClick={() => openRow(row)} className="w-full text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {row.kind === 'clip' ? 'Clip' : row.kind === 'pic' ? 'Pic' : row.kind === 'vod' ? 'VOD' : row.kind === 'news' ? 'News' : 'Video'}
                  </p>
                  <p className="text-sm font-semibold text-white truncate mt-0.5">{row.title}</p>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-500">{formatPostedAt(row.at) || '—'}</span>
              </div>
            </button>
            {row.kind !== 'news' && row.kind !== 'vod' ? (
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => openRow(row)}
                  className="h-8 flex-1 inline-flex items-center justify-center gap-1.5 border border-zinc-700 text-xs text-white hover:bg-white hover:text-black"
                >
                  <Play className="h-3.5 w-3.5" /> Open
                </button>
                {onVisibility ? (
                  <select
                    value={row.raw.visibility === 'private' || row.raw.status === 'draft' ? 'private' : (row.raw.visibility || 'public')}
                    onChange={(e) => onVisibility(row.raw, e.target.value)}
                    className="h-8 border border-zinc-700 bg-black px-1 text-[10px] text-white"
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
  const [onboardingDone, setOnboardingDone] = useState(() => lsGet(`calabi_onboarding_done_${user?.id}`, false))
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [range, setRange] = useState('all')
  const [postFilter, setPostFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const [cloudSyncBusy, setCloudSyncBusy] = useState(false)
  const [untilMs, setUntilMs] = useState(null)
  const [labTool, setLabTool] = useState(null) // 'controls' | 'stream' | null
  const [mapTick, setMapTick] = useState(0)

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
    if (user?.id) setOnboardingDone(lsGet(`calabi_onboarding_done_${user.id}`, false))
  }, [user?.id])

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

  const finishOnboarding = () => {
    if (user?.id) lsSet(`calabi_onboarding_done_${user.id}`, true)
    setOnboardingDone(true)
  }

  const posts = useMemo(() => getCreatorContent(user?.id, user?.handle), [user?.id, user?.handle, syncTick])
  const overviewSeries = useMemo(
    () => buildOverviewSeries(user?.id, posts, 14),
    [user?.id, posts, syncTick, mapTick]
  )
  const showOnboarding = !onboardingDone && posts.length === 0
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
  const verifyStatus = getIdVerificationForUser(user?.id)?.status
  const navGroups = groupNav(STUDIO_NAV)
  const meta = SECTION_META[section] || SECTION_META.overview
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

  return (
    <div className="h-[calc(100dvh-3.5rem)] min-h-[480px] flex bg-slate-100 text-slate-900 overflow-hidden" data-dash="light">
      {/* Labeled studio rail */}
      <aside className="hidden sm:flex w-56 shrink-0 border-r border-white/10 bg-[#1c2434] flex-col py-4 text-slate-200">
        <button
          type="button"
          onClick={() => onNavigate?.('home')}
          className="mx-3 mb-4 h-9 px-2 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Site
        </button>
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
          {navGroups.map((g) => (
            <div key={g.name}>
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{g.name}</p>
              <div className="space-y-1">
                {g.items.map((item) => {
                  const Icon = item.icon
                  const active = section === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-left rounded-lg',
                        active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile section picker */}
      <div className="sm:hidden absolute top-14 left-0 right-0 z-10 border-b border-slate-200 bg-white px-3 py-2">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="w-full h-9 border border-slate-200 bg-white px-2 text-sm text-slate-900 rounded-lg"
        >
          {STUDIO_NAV.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Posts column — only where it helps */}
      {showPostsColumn ? (
        <section className="w-[280px] max-w-[40vw] shrink-0 border-r border-slate-200 flex flex-col min-h-0 bg-white max-sm:hidden">
          <div className="shrink-0 px-3 py-3 border-b border-slate-200 space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Your posts</p>
              <p className="text-[11px] text-slate-500">Select one to filter the map</p>
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
                    'h-7 px-2 text-[11px] font-semibold',
                    postFilter === t.id ? 'bg-white text-black' : 'bg-[#18181f] text-zinc-400'
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
      <main className="flex-1 min-w-0 min-h-0 flex flex-col max-sm:pt-12 bg-slate-100">
        <header className="shrink-0 px-6 md:px-8 py-5 border-b border-slate-200 bg-white">
          <p className="text-lg font-semibold text-slate-900 tracking-tight">{meta.title}</p>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden px-6 md:px-8 py-6 md:py-8">
          {section === 'overview' ? (
            <div className="h-full min-h-0 overflow-y-auto space-y-8 max-w-4xl">
              {showOnboarding ? (
                <CreatorOnboarding
                  onOpenUpload={onOpenUpload}
                  onDone={finishOnboarding}
                  onNavigate={onNavigate}
                />
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <GrassBarChart title="Views / day" series={overviewSeries.views} />
                <GrassBarChart title="Followers / day" series={overviewSeries.followers} />
                <GrassBarChart title="Posts / day" series={overviewSeries.posts} />
              </div>
              <OverviewMembershipPrice userId={user?.id} />
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
                    labTool === 'controls' ? 'border-white text-white' : 'border-zinc-700 text-zinc-400 hover:text-white'
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Controls
                </button>
                <button
                  type="button"
                  onClick={() => setLabTool((t) => (t === 'stream' ? null : 'stream'))}
                  className={cn(
                    'h-8 px-2.5 text-[11px] font-semibold border inline-flex items-center gap-1.5',
                    labTool === 'stream' ? 'border-white text-white' : 'border-zinc-700 text-zinc-400 hover:text-white'
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
                <div className="max-w-2xl border border-zinc-800 p-4">
                  <StreamSettings />
                </div>
              ) : null}
              <MakePostPanel onOpenUpload={onOpenUpload} onNavigate={onNavigate} compact />
              <div className="border-t border-zinc-800 pt-6">
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
  )
}
