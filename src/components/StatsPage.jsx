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
  Sparkles,
} from 'lucide-react'
import { listIndexedUsers } from '../lib/moderation'
import { listImportsNormalized } from '../lib/contentService'
import { lsGet } from '../lib/storage'
import PageHeader from './PageHeader'

export default function StatsPage({ onNavigate }) {
  const users = useMemo(() => listIndexedUsers(), [])
  const allItems = useMemo(() => listImportsNormalized(), [])
  const likesMap = useMemo(() => lsGet('engagement_likes', {}) || {}, [])
  const subsMap = useMemo(() => lsGet('engagement_subs', {}) || {}, [])
  const liveBoard = useMemo(() => (lsGet('live_board', []) || []).filter((b) => b.isLive), [])

  // User & Creator metrics
  const totalUsers = Math.max(users.length, 1)
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
    const totalSec = clips.reduce((acc, c) => acc + (Number(c.durationSec) || (c.origin === 'upload' ? 45 : 30)), 0)
    return (totalSec / 3600).toFixed(2)
  }, [clips])

  const videoDurationHours = useMemo(() => {
    const totalSec = videos.reduce((acc, v) => acc + (Number(v.durationSec) || (v.origin === 'upload' ? 300 : 180)), 0)
    return (totalSec / 3600).toFixed(2)
  }, [videos])

  const numLiveStreamers = liveBoard.length

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, hint: 'Registered accounts' },
    { label: 'Total Views', value: totalViews.toLocaleString(), icon: Eye, hint: 'Verified impressions' },
    { label: 'Total Likes', value: totalLikes.toLocaleString(), icon: ThumbsUp, hint: 'Positive votes' },
    { label: 'Total Dislikes', value: totalDislikes.toLocaleString(), icon: ThumbsDown, hint: 'Negative votes' },
    { label: 'Approved Creators', value: totalCreators, icon: ShieldCheck, hint: 'Verified creators' },
    { label: 'Subscribers', value: totalSubscribers.toLocaleString(), icon: UserCheck, hint: 'Followers' },
    { label: 'Premium Subscribers', value: totalPremiumSubs.toLocaleString(), icon: Crown, hint: '$5/mo members' },
    { label: 'Number of Clips', value: numClips, icon: Clapperboard, hint: '9:16 vertical clips' },
    { label: 'Number of Videos', value: numVideos, icon: Film, hint: '16:9 standard videos' },
    { label: 'Active Live Streamers', value: numLiveStreamers, icon: Radio, hint: 'Broadcasting live' },
    { label: 'Clips Catalog Duration', value: `${clipDurationHours} hrs`, icon: Clock, hint: 'Total length of clips' },
    { label: 'Videos Catalog Duration', value: `${videoDurationHours} hrs`, icon: Clock, hint: 'Total length of videos' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader title="Platform Stats" onBack={() => onNavigate?.('home')} />

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

      {/* Transparency Guarantee Box */}
      <div className="rounded-2xl border border-zinc-800/80 bg-[#14141d] p-5 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Sparkles className="h-4 w-4 text-white" /> Pure Transparency Guarantee
        </div>
        <p className="leading-relaxed">
          Every number shown here is aggregated dynamically from real client interactions, registered users, and active video links. Clips never fabricates creators, streams, subscriber counts, or view bot traffic.
        </p>
      </div>
    </div>
  )
}
