import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import { getCreatorAnalytics, getCreatorRanking, PREMIUM_PRICE } from '../lib/engagement'

export default function AnalyticsPage({ onNavigate }) {
  const { user } = useAuth()
  const a = getCreatorAnalytics(user?.id)
  const rank = getCreatorRanking(user?.id)
  const cards = [
    { label: 'Views', value: a.views },
    { label: 'Watch hours', value: a.watchHours },
    { label: 'Subscribers', value: a.subscribers },
    { label: 'Premium ($5)', value: a.premiumSubs },
    { label: 'Likes', value: a.likes },
    { label: 'Dislikes', value: a.dislikes },
    { label: 'Clips', value: a.clips },
    { label: 'Rank', value: rank ? `#${rank}` : '—' },
  ]
  return (
    <div className="p-4 md:p-6 max-w-[1000px] mx-auto">
      <PageHeader title="Analytics" subtitle="Watch time, engagement, growth" onBack={() => onNavigate?.('dashboard')} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-zinc-800 bg-[#121218] p-4">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{c.label}</p>
            <p className="mt-1 text-xl font-semibold text-white">{c.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-zinc-500">Premium is fixed at ${PREMIUM_PRICE}/month. Metrics from this device until API is connected.</p>
    </div>
  )
}
