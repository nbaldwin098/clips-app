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
import { listImportsNormalized } from '../lib/contentService'
import { lsGet } from '../lib/storage'
import { useContentSyncTick } from '../lib/useContentSync'
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
      views += item.views || 0
      const vote = likesMap[item.id]
      if (vote) {
        up += vote.up || 0
        down += vote.down || 0
      }
    }
    return { totalLikes: up, totalDislikes: down, totalViews: views }
  }, [allItems, likesMap])

  const clips = allItems.filter((i) => i.type === 'short')
  const videos = allItems.filter((i) => i.type === 'video')
  const pics = allItems.filter((i) => i.type === 'pic')
  const numClips = clips.length
  const numVideos = videos.length
  const numPics = pics.length
  const numLives = liveBoard.length

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
      />

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
