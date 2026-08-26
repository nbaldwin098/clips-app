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
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CreatorOnboarding from '../CreatorOnboarding'
import { lsGet, lsSet } from '../../lib/storage'
import { getCreatorContent, deleteCatalogItem, setContentVisibility } from '../../lib/contentService'
import { getViews, getVotes, getSubscriberCount, getCreatorAnalytics } from '../../lib/engagement'
import { creatorBalance } from '../../lib/payouts'
import { listVods, setVodVisibility, getVodChannel } from '../../lib/vods'
import {
  getLinkedVodAccount,
  startVodAccountLink,
  confirmVodAccountLink,
  unlinkVodAccount,
} from '../../lib/vodAccountLink'
import { buildInteractionNetwork } from '../../lib/creatorInteractions'
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
import VerifyPage from '../VerifyPage'
import {
  getIdVerificationForUser,
  isVerifiedChannel,
} from '../../lib/verification'
import { isOfficialCreator } from '../../lib/uiFormat'
import {
  CREATOR_STUDIO_GROUPS,
  navigateStudioItem,
  statusLabel,
} from '../../lib/creatorStudioCatalog'
import {
  SettingsCard,
  SettingsKpiGrid,
  SettingsButton,
  SettingsNotice,
} from '../settings/SettingsTemplates'

const STUDIO_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Studio' },
  { id: 'lab', label: 'Calabi Studio', icon: Clapperboard, group: 'Studio' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Studio' },
  { id: 'controls', label: 'Controls', icon: SlidersHorizontal, group: 'Studio' },
  { id: 'socials', label: 'Socials', icon: Share2, group: 'Studio' },
  { id: 'earnings', label: 'Earnings', icon: CircleDollarSign, group: 'Money' },
  { id: 'vods', label: 'VODs', icon: Video, group: 'Live' },
  { id: 'stream', label: 'Stream', icon: Radio, group: 'Live' },
  { id: 'verify', label: 'Get verified', icon: BadgeCheck, group: 'Account' },
]

const SECTION_META = {
  overview: { title: 'Creator Studio', subtitle: 'Your workspace' },
  lab: { title: 'Calabi Studio', subtitle: 'Post · Edit · Live · Socials' },
  post: { title: 'Calabi Studio', subtitle: 'Post · Edit · Live · Socials' },
  analytics: { title: 'Analytics', subtitle: 'Channel numbers, bubble map, and live stats' },
  controls: { title: 'Controls', subtitle: 'Shortcuts for channel, stream, money, and growth' },
  socials: { title: 'Socials', subtitle: 'Connect accounts and post out' },
  earnings: { title: 'Earnings', subtitle: 'Tips, withdrawals, and income' },
  vods: { title: 'VOD library', subtitle: 'Past broadcasts' },
  stream: { title: 'Stream settings', subtitle: 'OBS and quality' },
  verify: { title: 'Verification', subtitle: 'ID check for a verified badge' },
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

function StudioControls({
  onNavigate,
  onOpenUpload,
  approved,
}) {
  const handlers = { onOpenUpload }
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight">Controls</h2>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed max-w-lg">
          Shortcuts for content, stream, community, growth, and money.
        </p>
      </div>
      <div className="space-y-8">
        {CREATOR_STUDIO_GROUPS.filter((g) => g.id !== 'account').map((group) => (
          <div key={group.id} className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">{group.label}</p>
              <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{group.description}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.items
                .filter((item) => item.status !== 'planned' && item.route && item.id !== 'import')
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateStudioItem(onNavigate, item, handlers)}
                    className="h-11 px-4 inline-flex items-center justify-between gap-2 border border-zinc-700 bg-[#0e0e14] text-sm font-medium text-zinc-200 hover:border-white hover:text-white hover:bg-[#16161f] transition-colors"
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">
                      {statusLabel(item.status)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      {!approved ? (
        <SettingsNotice>
          <p>Anyone can create. Apply when you want payouts.</p>
          <SettingsButton onClick={() => onNavigate?.('creator-apply')}>Apply to earn</SettingsButton>
        </SettingsNotice>
      ) : null}
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
    [user?.id, posts, selectedPostId, untilMs, postStartMs, syncTick, interactionTick]
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
      await deleteCatalogItem(post.id, user)
      if (selectedPostId === post.id) setSelectedPostId(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] min-h-[480px] flex bg-[#000000] text-zinc-100 overflow-hidden">
      {/* Labeled studio rail */}
      <aside className="hidden sm:flex w-56 shrink-0 border-r border-zinc-800 bg-[#050506] flex-col py-4">
        <button
          type="button"
          onClick={() => onNavigate?.('home')}
          className="mx-3 mb-4 h-9 px-2 inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Site
        </button>
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
          {navGroups.map((g) => (
            <div key={g.name}>
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{g.name}</p>
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
                        'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-left',
                        active ? 'bg-white text-black' : 'text-zinc-400 hover:bg-[#141418] hover:text-white'
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
        <div className="px-2 pt-2 border-t border-zinc-800 space-y-0.5">
          <button
            type="button"
            onClick={() => onNavigate?.('settings', 'channel')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-zinc-400 hover:bg-[#18181f] hover:text-white"
          >
            <Settings className="h-4 w-4" /> Creator settings
          </button>
        </div>
      </aside>

      {/* Mobile section picker */}
      <div className="sm:hidden absolute top-14 left-0 right-0 z-10 border-b border-zinc-800 bg-[#050506] px-3 py-2">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="w-full h-9 border border-zinc-800 bg-[#121218] px-2 text-sm text-white"
        >
          {STUDIO_NAV.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Posts column — only where it helps */}
      {showPostsColumn ? (
        <section className="w-[280px] max-w-[40vw] shrink-0 border-r border-zinc-800 flex flex-col min-h-0 bg-[#07070a] max-sm:hidden">
          <div className="shrink-0 px-3 py-3 border-b border-zinc-800 space-y-2">
            <div>
              <p className="text-sm font-semibold text-white">Your posts</p>
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
      <main className="flex-1 min-w-0 min-h-0 flex flex-col max-sm:pt-12">
        <header className="shrink-0 px-6 md:px-8 py-5 border-b border-zinc-800/80 bg-[#050506]">
          <p className="text-lg font-semibold text-white tracking-tight">{meta.title}</p>
          <p className="mt-1 text-sm text-zinc-500">
            @{user?.handle || 'creator'}
            {verified ? ' · Verified' : verifyStatus === 'pending' ? ' · ID in review' : ''}
            <span className="text-zinc-600"> · {meta.subtitle}</span>
          </p>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden px-6 md:px-8 py-6 md:py-8">
          {section === 'overview' ? (
            <div className="h-full min-h-0 overflow-y-auto space-y-10 max-w-3xl">
              {showOnboarding ? (
                <CreatorOnboarding
                  onOpenUpload={onOpenUpload}
                  onDone={finishOnboarding}
                  onNavigate={onNavigate}
                />
              ) : null}
              <div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">Welcome back</h2>
                <p className="mt-3 text-sm text-zinc-500 leading-relaxed max-w-md">
                  Open Calabi Studio to post, edit, or go live. Numbers live under Analytics.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSection('lab')}
                  className="h-11 px-5 bg-white text-black text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Clapperboard className="h-4 w-4" /> Calabi Studio
                </button>
                <button
                  type="button"
                  onClick={() => setSection('analytics')}
                  className="h-11 px-5 border border-zinc-700 text-sm text-zinc-200 hover:border-white"
                >
                  Analytics
                </button>
                <button
                  type="button"
                  onClick={() => setSection('controls')}
                  className="h-11 px-5 border border-zinc-700 text-sm text-zinc-200 hover:border-white"
                >
                  Controls
                </button>
              </div>
              {posts.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs uppercase tracking-wider text-zinc-600">Recent</p>
                  <ul className="space-y-2">
                    {posts.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => openPost(p)}
                          className="w-full text-left px-3 py-3 border border-zinc-800/80 hover:border-zinc-600"
                        >
                          <p className="text-sm text-white truncate">{p.title || 'Untitled'}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">{typeLabel(p.type)} · {formatCount(getViews(p.id))} views</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {section === 'post' || section === 'lab' ? (
            <div className="h-full overflow-y-auto space-y-8">
              <MakePostPanel onOpenUpload={onOpenUpload} onNavigate={onNavigate} compact />
              <div className="border-t border-zinc-800 pt-6">
                <CreatorLab onNavigate={onNavigate} compact />
              </div>
            </div>
          ) : null}

          {section === 'controls' ? (
            <div className="h-full overflow-y-auto">
              <StudioControls
                onNavigate={onNavigate}
                onOpenUpload={onOpenUpload}
                approved={approved}
              />
            </div>
          ) : null}

          {section === 'analytics' ? (
            <div className="h-full min-h-0 flex flex-col gap-4 overflow-hidden">
              <div className="shrink-0 space-y-3">
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-tight">Channel stats</h2>
                  <p className="mt-1 text-sm text-zinc-500">Posts, reach, and lobby — all in one place.</p>
                </div>
                <SettingsKpiGrid
                  columns={3}
                  items={[
                    { label: 'Posts', value: String(posts.length) },
                    { label: 'Unique viewers', value: formatCount(views) },
                    { label: 'Likes', value: formatCount(likes) },
                    { label: 'Followers', value: formatCount(followers), hint: `${formatCount(premiumSubs)} premium` },
                    { label: 'VODs', value: String(vods.length) },
                    { label: 'Lobby', value: live?.isLive ? 'Live' : 'Off', hint: approved ? `$${balance.paid.toFixed(2)} paid` : 'Apply to earn' },
                  ]}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800">
                <InteractionBubbleMap
                  network={network}
                  selectedPostId={selectedPostId}
                  selectedPost={selectedPost}
                  onSelectPost={setSelectedPostId}
                  postTitle={selectedPost?.title}
                  creator={user}
                  onRefresh={refreshAudienceFromCloud}
                  refreshing={cloudSyncBusy}
                  untilMs={untilMs ?? Date.now()}
                  onUntilChange={setUntilMs}
                  postStartMs={postStartMs}
                />
              </div>
              <div className="shrink-0 max-h-[36%] min-h-[160px] overflow-y-auto border-t border-zinc-800 pt-4">
                <StudioRealtimeAnalytics
                  creatorId={user?.id}
                  posts={posts}
                  selectedPost={selectedPost}
                  onSelectPost={setSelectedPostId}
                  range={range}
                  onRangeChange={setRange}
                  refreshing={cloudSyncBusy}
                  onRefresh={refreshAudienceFromCloud}
                  tick={interactionTick + syncTick}
                  untilMs={untilMs ?? Date.now()}
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

          {section === 'vods' ? (
            <div className="h-full overflow-y-auto">
              <VodsPanel user={user} />
            </div>
          ) : null}

          {section === 'stream' ? (
            <div className="h-full overflow-y-auto max-w-2xl">
              <StreamSettings />
            </div>
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
