import { useMemo } from 'react'
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
} from 'lucide-react'
import { listIndexedUsers } from '../lib/moderation'
import { listImportsNormalized, listPopularCreators } from '../lib/contentService'
import { lsGet } from '../lib/storage'
import { useContentSyncTick } from '../lib/useContentSync'
import { getViews } from '../lib/engagement'
import PageHeader from './PageHeader'
import SiteBubbleMap from './studio/SiteBubbleMap'

export default function StatsPage({ onNavigate }) {
  const syncTick = useContentSyncTick()
  const users = useMemo(() => listIndexedUsers(), [syncTick])
  const allItems = useMemo(() => listImportsNormalized(), [syncTick])
  const likesMap = useMemo(() => lsGet('engagement_likes', {}) || {}, [syncTick])
  const liveBoard = useMemo(() => (lsGet('live_board', []) || []).filter((b) => b.isLive), [syncTick])

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
      views += getViews(item.id)
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
  const numClips = clips.length
  const numVideos = videos.length
  const numPics = pics.length
  const numLives = liveBoard.length
  const numCreators = popularCreators.length

  const viewedRows = useMemo(() => {
    return allItems
      .map((item) => ({
        id: item.id,
        contentId: item.id,
        contentType: item.type,
        title: item.title || 'Untitled',
        handle: item.handle || '',
        thumbUrl: item.thumbUrl || item.mediaUrl || null,
        creatorId: item.creatorId || item.userId || null,
        weight: Math.max(0, getViews(item.id)),
      }))
      .filter((row) => row.weight > 0)
      .sort((a, b) => b.weight - a.weight)
  }, [allItems])

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
      videos: videos.map((v) => toRow(v, getViews(v.id) + 1, 'video')),
      clips: clips.map((c) => toRow(c, getViews(c.id) + 1, 'short')),
      pics: pics.map((p) => toRow(p, getViews(p.id) + 1, 'pic')),
      lives: liveRows,
      likes: liked,
      dislikes: disliked,
      creators: creatorRows,
      views: viewedRows,
      counts: {
        videos: numVideos,
        clips: numClips,
        pics: numPics,
        lives: numLives,
        likes: liked.length,
        dislikes: disliked.length,
        creators: numCreators,
        views: viewedRows.length,
      },
    }
  }, [
    allItems, likesMap, liveBoard, videos, clips, pics, popularCreators, viewedRows,
    numVideos, numClips, numPics, numLives, numCreators,
  ])

  const stats = [
    { label: 'Likes', value: totalLikes.toLocaleString(), icon: ThumbsUp, hint: 'Positive votes' },
    { label: 'Dislikes', value: totalDislikes.toLocaleString(), icon: ThumbsDown, hint: 'Negative votes' },
    { label: 'Lives', value: numLives.toLocaleString(), icon: Radio, hint: 'Broadcasting now' },
    { label: 'Clips', value: numClips.toLocaleString(), icon: Clapperboard, hint: 'Vertical short-form' },
    { label: 'Videos', value: numVideos.toLocaleString(), icon: Film, hint: 'Long-form videos' },
    { label: 'Pics', value: numPics.toLocaleString(), icon: ImageIcon, hint: 'Photo posts' },
    { label: 'Views', value: totalViews.toLocaleString(), icon: Eye, hint: 'Verified watch impressions' },
    { label: 'Users', value: totalUsers.toLocaleString(), icon: Users, hint: 'Registered accounts' },
    { label: 'Premium subscribers', value: totalPremiumSubs.toLocaleString(), icon: Crown, hint: 'Marked paid after Stripe return' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <PageHeader title="Platform Stats" onBack={() => onNavigate?.('home')} />

      <SiteBubbleMap
        videos={numVideos}
        clips={numClips}
        pics={numPics}
        lives={numLives}
        likes={totalLikes}
        dislikes={totalDislikes}
        creators={numCreators}
        views={viewedRows.length}
        buckets={bubbleBuckets}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 flex flex-col justify-between"
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
