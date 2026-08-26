import { useMemo, useState } from 'react'
import {
  Users,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Crown,
  Film,
  Clapperboard,
  Radio,
  Image as ImageIcon,
  Download,
  RotateCcw,
} from 'lucide-react'
import { listIndexedUsers } from '../lib/moderation'
import { listImportsNormalized, listPopularCreators } from '../lib/contentService'
import { lsGet } from '../lib/storage'
import { useContentSyncTick } from '../lib/useContentSync'
import { aggregateInteractionsByContent } from '../lib/creatorInteractions'
import {
  getCatalogBackupMeta,
  restoreCatalogBackup,
  downloadCatalogBackup,
  snapshotCatalogBackup,
} from '../lib/catalogBackup'
import PageHeader from './PageHeader'
import SiteBubbleMap from './studio/SiteBubbleMap'

export default function StatsPage({ onNavigate }) {
  const syncTick = useContentSyncTick()
  const [backupTick, setBackupTick] = useState(0)
  const users = useMemo(() => listIndexedUsers(), [syncTick])
  const allItems = useMemo(() => listImportsNormalized(), [syncTick])
  const likesMap = useMemo(() => lsGet('engagement_likes', {}) || {}, [syncTick])
  const liveBoard = useMemo(() => (lsGet('live_board', []) || []).filter((b) => b.isLive), [syncTick])
  const backupMeta = useMemo(() => getCatalogBackupMeta(), [syncTick, backupTick])

  const totalUsers = users.length

  const totalPremiumSubs = useMemo(() => {
    let count = 0
    if (typeof localStorage === 'undefined') return 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('premium_')) {
        const list = lsGet(k, [])
        if (Array.isArray(list)) count += list.length
      }
    }
    return count
  }, [syncTick])

  const { totalLikes, totalDislikes, totalViews } = useMemo(() => {
    let up = 0
    let down = 0
    let views = 0
    for (const item of allItems) {
      views += item.views || 0
      const vote = likesMap[item.id]
      if (vote) {
        up += vote.up || 0
        down += vote.down || 0
      }
    }
    return { totalLikes: up, totalDislikes: down, totalViews: views }
  }, [allItems, likesMap])

  const clips = useMemo(() => allItems.filter((i) => i.type === 'short'), [allItems])
  const videos = useMemo(() => allItems.filter((i) => i.type === 'video'), [allItems])
  const pics = useMemo(() => allItems.filter((i) => i.type === 'pic'), [allItems])
  const popularCreators = useMemo(() => listPopularCreators(120), [syncTick, allItems])
  const interactionRows = useMemo(() => aggregateInteractionsByContent(400), [syncTick])
  const numClips = clips.length
  const numVideos = videos.length
  const numPics = pics.length
  const numLives = liveBoard.length
  const numCreators = popularCreators.length
  const numInteractions = interactionRows.length

  const bubbleBuckets = useMemo(() => {
    const toRow = (item, weight, contentType) => ({
      id: item.id,
      contentId: item.id,
      contentType: contentType || item.type,
      title: item.title || 'Untitled',
      handle: item.handle || '',
      thumbUrl: item.thumbUrl || item.mediaUrl || null,
      creatorId: item.creatorId || item.userId || null,
      weight: Math.max(1, Number(weight) || 1),
    })

    const liked = []
    const disliked = []
    for (const item of allItems) {
      const vote = likesMap[item.id]
      const up = Number(vote?.up) || 0
      const down = Number(vote?.down) || 0
      if (up > 0) liked.push(toRow(item, up, item.type))
      if (down > 0) disliked.push(toRow(item, down, item.type))
    }

    const liveRows = liveBoard.map((s) => ({
      id: `live_${s.userId}`,
      contentId: s.userId,
      contentType: 'live',
      title: s.title || s.displayName || s.handle || 'Live',
      handle: s.handle || '',
      thumbUrl: s.thumbUrl || null,
      creatorId: s.userId || null,
      weight: 1,
    }))

    const creatorRows = popularCreators.map((c) => ({
      id: c.id,
      contentId: null,
      contentType: 'creator',
      title: c.displayName || c.handle || 'Creator',
      displayName: c.displayName || c.handle || 'Creator',
      handle: c.handle || '',
      thumbUrl: c.avatarUrl || null,
      avatarUrl: c.avatarUrl || null,
      creatorId: c.id,
      weight: Math.max(1, Number(c.postCount) || Number(c.views) || 1),
    }))

    return {
      videos: videos.map((v) => toRow(v, (v.views || 0) + 1, 'video')),
      clips: clips.map((c) => toRow(c, (c.views || 0) + 1, 'short')),
      pics: pics.map((p) => toRow(p, 1, 'pic')),
      lives: liveRows,
      likes: liked,
      dislikes: disliked,
      creators: creatorRows,
      interactions: interactionRows,
      counts: {
        videos: numVideos,
        clips: numClips,
        pics: numPics,
        lives: numLives,
        likes: liked.length,
        dislikes: disliked.length,
        creators: numCreators,
        interactions: numInteractions,
      },
    }
  }, [
    allItems, likesMap, liveBoard, videos, clips, pics, popularCreators, interactionRows,
    numVideos, numClips, numPics, numLives, numCreators, numInteractions,
  ])

  const stats = [
    { label: 'Users', value: totalUsers.toLocaleString(), icon: Users, hint: 'Registered accounts' },
    { label: 'Likes', value: totalLikes.toLocaleString(), icon: ThumbsUp, hint: 'Positive votes' },
    { label: 'Dislikes', value: totalDislikes.toLocaleString(), icon: ThumbsDown, hint: 'Negative votes' },
    { label: 'Views', value: totalViews.toLocaleString(), icon: Eye, hint: 'Verified watch impressions' },
    { label: 'Clips', value: numClips.toLocaleString(), icon: Clapperboard, hint: 'Vertical short-form' },
    { label: 'Videos', value: numVideos.toLocaleString(), icon: Film, hint: 'Long-form videos' },
    { label: 'Lives', value: numLives.toLocaleString(), icon: Radio, hint: 'Broadcasting now' },
    { label: 'Pics', value: numPics.toLocaleString(), icon: ImageIcon, hint: 'Photo posts' },
    { label: 'Premium subscribers', value: totalPremiumSubs.toLocaleString(), icon: Crown, hint: 'Marked paid after Stripe return' },
  ]

  const onSnapshotNow = () => {
    snapshotCatalogBackup('manual')
    setBackupTick((n) => n + 1)
  }

  const onRestore = () => {
    if (!backupMeta?.count) return
    if (!window.confirm(`Restore ${backupMeta.count} posts from backup (${backupMeta.at})? This replaces the session catalog only — cloud is unchanged.`)) return
    const res = restoreCatalogBackup()
    if (res?.ok) setBackupTick((n) => n + 1)
    else window.alert(res?.error || 'Restore failed')
  }

  const onDownload = () => {
    const res = downloadCatalogBackup()
    if (!res?.ok) window.alert(res?.error || 'No backup to download')
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <PageHeader title="Platform Stats" onBack={() => onNavigate?.('home')} />
      <p className="text-xs text-zinc-500">Counts from this catalog — nothing invented.</p>

      <SiteBubbleMap
        videos={numVideos}
        clips={numClips}
        pics={numPics}
        lives={numLives}
        likes={totalLikes}
        dislikes={totalDislikes}
        creators={numCreators}
        interactions={numInteractions}
        buckets={bubbleBuckets}
        onNavigate={onNavigate}
      />

      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-white">Catalog safety backup</p>
          <p className="text-xs text-zinc-500 mt-1">
            Local last-known-good snapshot. Taken after cloud sync and before intentional deletes. Not a full cloud backup.
          </p>
        </div>
        <p className="text-xs text-zinc-400">
          {backupMeta?.count
            ? `Latest: ${backupMeta.count} posts · ${backupMeta.at} · ${backupMeta.reason || 'snapshot'}`
            : 'No backup yet — sync the catalog or snapshot manually.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSnapshotNow}
            className="h-8 px-3 border border-zinc-700 text-xs text-zinc-200 hover:border-white hover:text-white"
          >
            Snapshot now
          </button>
          <button
            type="button"
            onClick={onRestore}
            disabled={!backupMeta?.count}
            className="h-8 px-3 inline-flex items-center gap-1.5 border border-zinc-700 text-xs text-zinc-200 hover:border-white hover:text-white disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restore session
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={!backupMeta?.count}
            className="h-8 px-3 inline-flex items-center gap-1.5 border border-zinc-700 text-xs text-zinc-200 hover:border-white hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Download JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 hover:border-zinc-700 transition-all card-lift flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">{label}</span>
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
