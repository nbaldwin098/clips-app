import { useMemo, useState, useEffect } from 'react'
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  Video,
  BadgeCheck,
  Settings,
  Upload,
  Link2,
  Radio,
  ChevronLeft,
  Play,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CreatorOnboarding from '../CreatorOnboarding'
import { lsGet, lsSet } from '../../lib/storage'
import { getCreatorContent } from '../../lib/contentService'
import { getViews, getVotes } from '../../lib/engagement'
import { creatorBalance } from '../../lib/payouts'
import { listVods, setVodVisibility, getVodChannel } from '../../lib/vods'
import { buildInteractionBubbles } from '../../lib/creatorInteractions'
import { formatCount } from '../../lib/uiFormat'
import { formatPostedAt } from '../../lib/mediaMeta'
import { cn } from '../../lib/utils'
import { restoreLostUploads } from '../../lib/restoreUploads'
import { useContentSyncTick } from '../../lib/useContentSync'
import InteractionBubbleMap from './InteractionBubbleMap'
import CreatorAnalyticsPanel from '../settings/CreatorAnalyticsPanel'
import RevenueSettings from '../settings/RevenueSettings'
import VerifyPage from '../VerifyPage'
import {
  getIdVerificationForUser,
  isVerifiedChannel,
} from '../../lib/verification'
import { isOfficialCreator } from '../../lib/uiFormat'

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'vods', label: 'VODs', icon: Video },
  { id: 'verify', label: 'Get verified', icon: BadgeCheck },
]

function typeLabel(type) {
  if (type === 'video') return 'Video'
  if (type === 'pic') return 'Pic'
  return 'Clip'
}

function PostRow({ post, active, onSelect, onPlay }) {
  const views = getViews(post.id) || post.views || 0
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
          <span className="shrink-0 text-[10px] text-zinc-500">{formatPostedAt(post.createdAt) || '—'}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="h-6 px-2 inline-flex items-center text-[10px] font-semibold bg-[#18181f] text-zinc-300 border border-zinc-800">
            {formatCount(views)} views
          </span>
          <span className="h-6 px-2 inline-flex items-center text-[10px] font-semibold bg-[#18181f] text-zinc-300 border border-zinc-800">
            {formatCount(likes)} likes
          </span>
          <span className="h-6 px-2 inline-flex items-center text-[10px] font-semibold bg-[#18181f] text-zinc-300 border border-zinc-800">
            {post.status || 'live'}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onPlay(post)}
        className="mt-2 h-8 w-full inline-flex items-center justify-center gap-1.5 border border-zinc-700 text-xs text-white hover:bg-white hover:text-black"
      >
        <Play className="h-3.5 w-3.5" /> Open
      </button>
    </div>
  )
}

function OverviewStats({ posts, views, vods, live, approved, paid }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
      {[
        { label: 'Posts', value: String(posts) },
        { label: 'Views', value: formatCount(views) },
        { label: 'VODs', value: String(vods) },
        { label: 'Lobby', value: live ? 'Live' : 'Off' },
      ].map((s) => (
        <div key={s.label} className="border border-zinc-800 bg-[#0c0c10] p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</p>
          <p className="mt-1 text-xl font-semibold text-white tabular-nums">{s.value}</p>
        </div>
      ))}
      {approved ? (
        <p className="col-span-2 lg:col-span-4 text-[11px] text-zinc-500">
          ${paid.toFixed(2)} marked paid by hand. Views do not pay a rate.
        </p>
      ) : null}
    </div>
  )
}

function VodsPanel({ user, onNavigate }) {
  const vods = listVods(user?.id)
  const ch = getVodChannel(user?.id)
  return (
    <div className="space-y-3 p-1">
      <p className="text-xs text-zinc-500">
        Copies of ended live lobbies on this device.
        {ch.enabled ? ` Second channel @${ch.handle || '—'} is ${ch.autoPublish ? 'auto-posting' : 'manual'}.` : ' Second channel is off.'}
      </p>
      <button
        type="button"
        onClick={() => onNavigate?.('settings', 'stream')}
        className="h-9 px-3 border border-zinc-700 text-xs text-white"
      >
        VOD & stream settings
      </button>
      {vods.length === 0 ? (
        <p className="text-sm text-zinc-500">No lives ended on this device yet.</p>
      ) : vods.map((v) => (
        <div key={v.id} className="border border-zinc-800 bg-[#0c0c10] p-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-white">{v.title}</p>
            <p className="text-[11px] text-zinc-500">
              {v.endedAt?.slice(0, 16).replace('T', ' ')} · {Math.round((v.durationSec || 0) / 60)} min
            </p>
          </div>
          <select
            value={v.visibility}
            onChange={(e) => setVodVisibility(v.id, e.target.value)}
            className="h-9 border border-zinc-800 bg-black px-2 text-xs text-white"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
      ))}
    </div>
  )
}

function VerifyPanel({ onOpenAuth, onNavigate }) {
  return (
    <div className="max-w-xl">
      <VerifyPage onOpenAuth={onOpenAuth} onNavigate={onNavigate} />
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
  const [section, setSection] = useState(() => lsGet('calabi_studio_section', initialSection) || initialSection)
  const [onboardingDone, setOnboardingDone] = useState(() => lsGet(`calabi_onboarding_done_${user?.id}`, false))
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [range, setRange] = useState('7d')
  const [postFilter, setPostFilter] = useState('all')
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [restoreNote, setRestoreNote] = useState('')

  useEffect(() => {
    lsSet('calabi_studio_section', section)
  }, [section])

  useEffect(() => {
    if (user?.id) setOnboardingDone(lsGet(`calabi_onboarding_done_${user.id}`, false))
  }, [user?.id])

  const finishOnboarding = () => {
    if (user?.id) lsSet(`calabi_onboarding_done_${user.id}`, true)
    setOnboardingDone(true)
  }

  const posts = useMemo(() => getCreatorContent(user?.id, user?.handle), [user?.id, user?.handle, syncTick])
  const showOnboarding = !onboardingDone && posts.length === 0
  const live = lsGet(`live_state_${user?.id}`, null)
  const views = posts.reduce((n, c) => n + (getViews(c.id) || c.views || 0), 0)
  const approved = user?.creatorStatus === 'approved'
  const balance = creatorBalance(user?.id, user?.handle)
  const vods = listVods(user?.id)
  const verified = isOfficialCreator(user?.id, user?.handle) || isVerifiedChannel(user?.id, user?.handle)
  const verifyStatus = getIdVerificationForUser(user?.id)?.status

  const filteredPosts = useMemo(() => {
    if (postFilter === 'all') return posts
    if (postFilter === 'video') return posts.filter((p) => p.type === 'video')
    if (postFilter === 'clip') return posts.filter((p) => p.type === 'short')
    if (postFilter === 'pic') return posts.filter((p) => p.type === 'pic')
    return posts
  }, [posts, postFilter])

  const selectedPost = posts.find((p) => p.id === selectedPostId) || null

  const bubbles = useMemo(
    () => buildInteractionBubbles(user?.id, posts, { contentId: selectedPostId, range }),
    [user?.id, posts, selectedPostId, range]
  )

  const openPost = (c) => {
    if (onPlayItem) onPlayItem(c)
    else if (c?.type === 'pic') onNavigate?.('pics', c.id)
    else if (c?.type === 'short') onNavigate?.('clips', c.id)
    else if (c?.id) onNavigate?.('watch', c.id)
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
      {/* Icon rail — creator pages only */}
      <aside className="w-14 shrink-0 border-r border-zinc-800 bg-[#050506] flex flex-col items-center py-3 gap-1">
        <button
          type="button"
          onClick={() => onNavigate?.('home')}
          className="h-10 w-10 flex items-center justify-center text-zinc-500 hover:text-white"
          title="Back to site"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="w-8 border-t border-zinc-800 my-1" />
        {NAV.map((item) => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              title={item.label}
              className={cn(
                'h-10 w-10 flex items-center justify-center',
                active ? 'bg-white text-black' : 'text-zinc-400 hover:text-white hover:bg-[#18181f]'
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onNavigate?.('settings', 'channel')}
          title="Creator settings"
          className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#18181f]"
        >
          <Settings className="h-5 w-5" />
        </button>
      </aside>

      {/* Posts column */}
      <section className="w-[300px] max-w-[42vw] shrink-0 border-r border-zinc-800 flex flex-col min-h-0 bg-[#07070a]">
        <div className="shrink-0 px-3 py-3 border-b border-zinc-800">
          <p className="text-sm font-semibold text-white">Your posts</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Select a post to filter the interaction map</p>
          <div className="mt-2 flex gap-1">
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
          <div className="mt-2 grid grid-cols-2 gap-1">
            <button type="button" onClick={onOpenUpload} className="h-8 inline-flex items-center justify-center gap-1 bg-white text-black text-[11px] font-semibold">
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
            <button type="button" onClick={onOpenImport} className="h-8 inline-flex items-center justify-center gap-1 border border-zinc-700 text-[11px] text-white">
              <Link2 className="h-3.5 w-3.5" /> Import
            </button>
            <button type="button" onClick={() => onNavigate?.('live')} className="h-8 inline-flex items-center justify-center gap-1 border border-zinc-700 text-[11px] text-white">
              <Radio className="h-3.5 w-3.5" /> Live
            </button>
            <button
              type="button"
              onClick={onRestore}
              disabled={restoreBusy}
              className="h-8 inline-flex items-center justify-center gap-1 border border-zinc-700 text-[11px] text-white disabled:opacity-50"
              title="Restore missing posts"
            >
              <RotateCcw className={cn('h-3.5 w-3.5', restoreBusy && 'animate-spin')} />
              {restoreBusy ? 'Restoring…' : 'Restore'}
            </button>
          </div>
          {restoreNote ? (
            <p className="mt-2 text-[10px] text-zinc-400 leading-snug">{restoreNote}</p>
          ) : null}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
          {filteredPosts.length === 0 ? (
            <div className="p-3 space-y-2">
              <p className="text-xs text-zinc-500">No posts yet. Upload a video, clip, or pic.</p>
              <button
                type="button"
                onClick={onRestore}
                disabled={restoreBusy}
                className="text-[11px] text-zinc-300 underline underline-offset-2 disabled:opacity-50"
              >
                Restore posts…
              </button>
            </div>
          ) : filteredPosts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              active={selectedPostId === post.id}
              onSelect={setSelectedPostId}
              onPlay={openPost}
            />
          ))}
        </div>
      </section>

      {/* Main workspace */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-[#050506]">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {section === 'overview' && 'Creator Studio'}
              {section === 'analytics' && 'Analytics'}
              {section === 'wallet' && 'Revenue & wallet'}
              {section === 'vods' && 'VOD library'}
              {section === 'verify' && 'Verification'}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">
              @{user?.handle || 'creator'} · {posts.length} posts · {formatCount(views)} views
              {verified ? ' · Verified' : verifyStatus === 'pending' ? ' · ID in review' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="h-7 px-2 inline-flex items-center text-[10px] font-semibold border border-zinc-800 text-zinc-400">
              {vods.length} VODs
            </span>
            <span className="h-7 px-2 inline-flex items-center text-[10px] font-semibold border border-zinc-800 text-zinc-400">
              {live?.isLive ? 'Lobby live' : 'Lobby off'}
            </span>
            {approved ? (
              <span className="h-7 px-2 inline-flex items-center text-[10px] font-semibold bg-emerald-950/40 border border-emerald-900/50 text-emerald-200">
                Earn approved
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate?.('creator-apply')}
                className="h-7 px-2 text-[10px] font-semibold border border-zinc-700 text-zinc-300"
              >
                Apply to earn
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden p-3">
          {section === 'overview' ? (
            <div className="h-full min-h-0 flex flex-col gap-3 overflow-y-auto">
              {showOnboarding ? (
                <CreatorOnboarding
                  onOpenImport={onOpenImport}
                  onDone={finishOnboarding}
                  onNavigate={onNavigate}
                />
              ) : null}
              <OverviewStats
                posts={posts.length}
                views={views}
                vods={vods.length}
                live={!!live?.isLive}
                approved={approved}
                paid={balance.paid}
              />
              <div className="flex-1 min-h-0">
                <InteractionBubbleMap
                  nodes={bubbles}
                  range={range}
                  onRangeChange={setRange}
                  selectedPostId={selectedPostId}
                  onSelectPost={setSelectedPostId}
                  postTitle={selectedPost?.title}
                />
              </div>
            </div>
          ) : null}

          {section === 'analytics' ? (
            <div className="h-full overflow-y-auto">
              <CreatorAnalyticsPanel embedded onNavigate={onNavigate} />
            </div>
          ) : null}

          {section === 'wallet' ? (
            <div className="h-full overflow-y-auto">
              <RevenueSettings onNavigate={onNavigate} />
            </div>
          ) : null}

          {section === 'vods' ? (
            <div className="h-full overflow-y-auto">
              <VodsPanel user={user} onNavigate={onNavigate} />
            </div>
          ) : null}

          {section === 'verify' ? (
            <div className="h-full overflow-y-auto">
              <VerifyPanel onOpenAuth={onOpenAuth} onNavigate={onNavigate} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
