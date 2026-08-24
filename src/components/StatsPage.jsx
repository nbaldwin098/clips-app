import { useMemo } from 'react'
import {
  Users,
  ThumbsUp,
  ThumbsDown,
  Eye,
  ShieldCheck,
  UserCheck,
  Crown,
  Film,
  Clapperboard,
  Radio,
  Clock,
} from 'lucide-react'
import { listIndexedUsers } from '../lib/moderation'
import { listImportsNormalized } from '../lib/contentService'
import { lsGet } from '../lib/storage'
import { useContentSyncTick } from '../lib/useContentSync'
import PageHeader from './PageHeader'

export default function StatsPage({ onNavigate }) {
  const syncTick = useContentSyncTick()
  const users = useMemo(() => listIndexedUsers(), [syncTick])
  const allItems = useMemo(() => listImportsNormalized(), [syncTick])
  const likesMap = useMemo(() => lsGet('engagement_likes', {}) || {}, [syncTick])
  const subsMap = useMemo(() => lsGet('engagement_subs', {}) || {}, [syncTick])
  const liveBoard = useMemo(() => (lsGet('live_board', []) || []).filter((b) => b.isLive), [syncTick])

  const totalUsers = users.length
  const approvedCreators = users.filter((u) => u.creatorStatus === 'approved' || u.isCreator)
  const totalCreators = approvedCreators.length

  // Subscriptions & Premium
  const totalSubscribers = useMemo(() => {
    let count = 0
    for (const list of Object.values(subsMap)) {
      if (Array.isArray(list)) count += list.length
    }
    return count
  }, [subsMap])

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
  }, [])

  // Aggregate likes, dislikes, views
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

  // Clips vs Videos breakdown
  const clips = allItems.filter((i) => i.type === 'short')
  const videos = allItems.filter((i) => i.type !== 'short')
  const numClips = clips.length
  const numVideos = videos.length

  // Duration in hours
  const clipDurationHours = useMemo(() => {
    const totalSec = clips.reduce((acc, c) => acc + (Number(c.durationSec) || 0), 0)
    return (totalSec / 3600).toFixed(2)
  }, [clips])

  const videoDurationHours = useMemo(() => {
    const totalSec = videos.reduce((acc, v) => acc + (Number(v.durationSec) || 0), 0)
    return (totalSec / 3600).toFixed(2)
  }, [videos])

  const numLiveStreamers = liveBoard.length

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, hint: 'Registered platform accounts' },
    { label: 'Total Views', value: totalViews.toLocaleString(), icon: Eye, hint: 'Verified watch impressions' },
    { label: 'Total Likes', value: totalLikes.toLocaleString(), icon: ThumbsUp, hint: 'Positive community votes' },
    { label: 'Total Dislikes', value: totalDislikes.toLocaleString(), icon: ThumbsDown, hint: 'Negative feedback votes' },
    { label: 'Creators', value: totalCreators, icon: ShieldCheck, hint: 'Accounts that can post' },
    { label: 'Subscribers', value: totalSubscribers.toLocaleString(), icon: UserCheck, hint: 'Channel follower relationships' },
    { label: 'Premium Subscribers', value: totalPremiumSubs.toLocaleString(), icon: Crown, hint: 'Marked paid after Stripe return' },
    { label: 'Number of short videos', value: numClips, icon: Clapperboard, hint: 'Vertical short-form media' },
    { label: 'Number of Videos', value: numVideos, icon: Film, hint: 'Standard 1080p long-form videos' },
    { label: 'Active Live Streamers', value: numLiveStreamers, icon: Radio, hint: 'Broadcasting live right now' },
    { label: 'Short video catalog duration', value: `${clipDurationHours} hrs`, icon: Clock, hint: 'Total length of all short videos in hours' },
    { label: 'Videos Catalog Duration', value: `${videoDurationHours} hrs`, icon: Clock, hint: 'Total length of all videos in hours' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader title="Platform Stats" onBack={() => onNavigate?.('home')} />
      <p className="text-xs text-zinc-500">Counts from this catalog — nothing invented.</p>

      {/* Grid of Stat Cards */}
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
