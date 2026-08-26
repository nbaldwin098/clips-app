import { useMemo, useState, useEffect } from 'react'
import {
  LayoutDashboard,
  BarChart3,
  CircleDollarSign,
  Video,
  BadgeCheck,
  Settings,
  Upload,
  Link2,
  Radio,
  ChevronLeft,
  Play,
  RotateCcw,
  Trash2,
  Clapperboard,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CreatorOnboarding from '../CreatorOnboarding'
import { lsGet, lsSet } from '../../lib/storage'
import { getCreatorContent, deleteCatalogItem } from '../../lib/contentService'
import { getViews, getVotes, getSubscriberCount, getCreatorAnalytics } from '../../lib/engagement'
import { creatorBalance } from '../../lib/payouts'
import { listVods, setVodVisibility, getVodChannel } from '../../lib/vods'
import { buildInteractionNetwork } from '../../lib/creatorInteractions'
import { formatCount } from '../../lib/uiFormat'
import { formatPostedAt, postedAtOf } from '../../lib/mediaMeta'
import { cn } from '../../lib/utils'
import { restoreLostUploads } from '../../lib/restoreUploads'
import { useContentSyncTick, useInteractionSyncTick } from '../../lib/useContentSync'
import InteractionBubbleMap from './InteractionBubbleMap'
import ErrorReportPrompt from '../ErrorReportPrompt'
import CreatorAnalyticsPanel from '../settings/CreatorAnalyticsPanel'
import CreatorEarningsPanel from './CreatorEarningsPanel'
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
  SettingsPageHeader,
  SettingsCard,
  SettingsKpiGrid,
  SettingsButton,
  SettingsNotice,
} from '../settings/SettingsTemplates'

const STUDIO_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Studio' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Studio' },
  { id: 'earnings', label: 'Earnings', icon: CircleDollarSign, group: 'Money' },
  { id: 'vods', label: 'VODs', icon: Video, group: 'Live' },
  { id: 'stream', label: 'Stream', icon: Radio, group: 'Live' },
  { id: 'verify', label: 'Get verified', icon: BadgeCheck, group: 'Account' },
]

const SECTION_META = {
  overview: { title: 'Creator Studio', subtitle: 'Posts, audience, and shortcuts' },
  analytics: { title: 'Analytics', subtitle: 'Every signed-in visitor on your posts — brown = view only, color = action' },
  earnings: { title: 'Earnings', subtitle: 'Tips, withdrawals, and income chart' },
  vods: { title: 'VOD library', subtitle: 'Past lives — manage visibility here' },
  stream: { title: 'Stream settings', subtitle: 'Key, quality, and VOD channel — stays in the dashboard' },
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

function PostRow({ post, active, deleting, onSelect, onPlay, onDelete }) {
  const views = getViews(post.id)
  const likes = getVotes(post.id)?.up || 0
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
          <span>{post.status || 'live'}</span>
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
  const vods = listVods(user?.id)
  const ch = getVodChannel(user?.id)
  return (
    <div className="space-y-4 max-w-2xl">
      <SettingsNotice>
        <p>
          Ended live lobbies for your cloud account.
          {ch.enabled
            ? ` Second channel @${ch.handle || '—'} is ${ch.autoPublish ? 'auto-posting' : 'manual'}.`
            : ' Second channel is off — turn it on under Stream in this dashboard.'}
        </p>
      </SettingsNotice>
      {vods.length === 0 ? (
        <p className="text-sm text-zinc-500">No lives ended yet.</p>
      ) : vods.map((v) => (
        <SettingsCard key={v.id} title={v.title || 'Past broadcast'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-500">
              {v.endedAt?.slice(0, 16).replace('T', ' ')} · {Math.round((v.durationSec || 0) / 60)} min
            </p>
            <select
              value={v.visibility}
              onChange={(e) => setVodVisibility(v.id, e.target.value)}
              className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>
        </SettingsCard>
      ))}
    </div>
  )
}

function StudioHub({
  onNavigate,
  onOpenUpload,
  onOpenImport,
  approved,
}) {
  const handlers = { onOpenUpload, onOpenImport }
  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title="Shortcuts"
        subtitle="Organized by what you are doing — not a wall of buttons."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {CREATOR_STUDIO_GROUPS.filter((g) => g.id !== 'account').map((group) => (
          <SettingsCard
            key={group.id}
            title={group.label}
            description={group.description}
          >
            <ul className="space-y-1">
              {group.items
                .filter((item) => item.status !== 'planned' && item.route)
                .slice(0, 5)
                .map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigateStudioItem(onNavigate, item, handlers)}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-[#18181f] hover:text-white"
                    >
                      <span>{item.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                        {statusLabel(item.status)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </SettingsCard>
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

export default function CreatorStudio({
  onOpenImport,
  onOpenUpload,
  onNavigate,
  onPlayItem,
  onOpenAuth,
  initialSection = 'overview',
}) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const interactionTick = useInteractionSyncTick()
  const [section, setSection] = useState(() => lsGet('calabi_studio_section', initialSection) || initialSection)
  const [onboardingDone, setOnboardingDone] = useState(() => lsGet(`calabi_onboarding_done_${user?.id}`, false))
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [range, setRange] = useState('all')
  const [postFilter, setPostFilter] = useState('all')
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [restoreNote, setRestoreNote] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (!initialSection) return
    if (initialSection === 'wallet') setSection('earnings')
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
      import('../../lib/graphSync').then(({ syncCreatorInteractionsFromCloud }) => {
        if (cancelled) return
        syncCreatorInteractionsFromCloud?.().catch(() => {})
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
    const t = setInterval(sync, 20000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [user?.id, user?.provider, user?.handle])

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
  const showPostsColumn = section === 'overview' || section === 'analytics'

  const filteredPosts = useMemo(() => {
    if (postFilter === 'all') return posts
    if (postFilter === 'video') return posts.filter((p) => p.type === 'video')
    if (postFilter === 'clip') return posts.filter((p) => p.type === 'short')
    if (postFilter === 'pic') return posts.filter((p) => p.type === 'pic')
    return posts
  }, [posts, postFilter])

  const selectedPost = posts.find((p) => p.id === selectedPostId) || null

  const network = useMemo(
    () => buildInteractionNetwork(user?.id, posts, { contentId: selectedPostId, range }),
    [user?.id, posts, selectedPostId, range, syncTick, interactionTick]
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

  const onRestore = async () => {
    setRestoreBusy(true)
    setRestoreNote('')
    try {
      const res = await restoreLostUploads(user)
      const n = Number(res?.total) || 0
      if (res?.error) setRestoreNote(res.error)
      else if (n) setRestoreNote(`Restored ${n} post${n === 1 ? '' : 's'}.`)
      else setRestoreNote('Nothing to restore on this device.')
    } catch {
      setRestoreNote("Couldn't restore right now.")
    } finally {
      setRestoreBusy(false)
    }
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] min-h-[480px] flex bg-[#000000] text-zinc-100 overflow-hidden">
      {/* Labeled studio rail */}
      <aside className="hidden sm:flex w-52 shrink-0 border-r border-zinc-800 bg-[#050506] flex-col py-3">
        <button
          type="button"
          onClick={() => onNavigate?.('home')}
          className="mx-2 mb-2 h-9 px-2 inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Site
        </button>
        <nav className="flex-1 px-2 space-y-4 overflow-y-auto">
          {navGroups.map((g) => (
            <div key={g.name}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{g.name}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = item.icon
                  const active = section === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium text-left',
                        active ? 'bg-white text-black' : 'text-zinc-400 hover:bg-[#18181f] hover:text-white'
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
            onClick={() => onNavigate?.('calabi-studio')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-zinc-400 hover:bg-[#18181f] hover:text-white"
          >
            <Clapperboard className="h-4 w-4" /> Calabi Studio
          </button>
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
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Main workspace */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col max-sm:pt-12">
        <header className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-[#050506]">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{meta.title}</p>
            <p className="text-[11px] text-zinc-500 truncate">
              @{user?.handle || 'creator'} · {posts.length} posts · {formatCount(views)} views
              {verified ? ' · Verified' : verifyStatus === 'pending' ? ' · ID in review' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SettingsButton onClick={onOpenUpload} className="h-8 px-3 text-xs inline-flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload
            </SettingsButton>
            <SettingsButton variant="ghost" onClick={onOpenImport} className="h-8 px-3 text-xs inline-flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Import
            </SettingsButton>
            <SettingsButton variant="ghost" onClick={() => onNavigate?.('live')} className="h-8 px-3 text-xs inline-flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5" /> Live
            </SettingsButton>
            <button
              type="button"
              onClick={onRestore}
              disabled={restoreBusy}
              className="h-8 w-8 inline-flex items-center justify-center border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-50"
              title="Restore missing posts"
            >
              <RotateCcw className={cn('h-3.5 w-3.5', restoreBusy && 'animate-spin')} />
            </button>
          </div>
        </header>
        {restoreNote ? (
          <div className="px-4 py-2 border-b border-zinc-900 text-[11px] text-zinc-400">
            {restoreNote}
            {restoreNote.includes("Couldn't") || restoreNote.toLowerCase().includes('error') ? (
              <ErrorReportPrompt message={restoreNote} context="restore-uploads" />
            ) : null}
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-hidden p-3 md:p-4">
          {section === 'overview' ? (
            <div className="h-full min-h-0 flex flex-col gap-4 overflow-y-auto">
              {showOnboarding ? (
                <CreatorOnboarding
                  onOpenImport={onOpenImport}
                  onDone={finishOnboarding}
                  onNavigate={onNavigate}
                />
              ) : null}
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
              <StudioHub
                onNavigate={onNavigate}
                onOpenUpload={onOpenUpload}
                onOpenImport={onOpenImport}
                approved={approved}
              />
              <button
                type="button"
                onClick={() => setSection('analytics')}
                className="self-start h-9 px-3 border border-zinc-700 text-xs text-white hover:bg-white hover:text-black"
              >
                Open interaction map in Analytics →
              </button>
            </div>
          ) : null}

          {section === 'analytics' ? (
            <div className="h-full min-h-0 flex flex-col gap-4 overflow-hidden">
              <div className="min-h-0 flex-1 min-h-[320px]">
                <InteractionBubbleMap
                  network={network}
                  range={range}
                  onRangeChange={setRange}
                  selectedPostId={selectedPostId}
                  onSelectPost={setSelectedPostId}
                  postTitle={selectedPost?.title}
                  creator={user}
                />
              </div>
              <div className="shrink-0 max-h-[40%] overflow-y-auto border-t border-zinc-800 pt-3">
                <CreatorAnalyticsPanel embedded onNavigate={onNavigate} />
              </div>
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
