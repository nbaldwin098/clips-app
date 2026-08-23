import { useMemo } from 'react'
import { Clapperboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getShortsFeed } from '../lib/contentService'
import ContentCard from './ContentCard'

export default function ShortsFeed() {
  const { user } = useAuth()
  const items = useMemo(() => getShortsFeed(user?.id || null), [user?.id])

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-100">Clips</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Vertical short-form · ranked by the learning engine</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/15 flex items-center justify-center">
            <Clapperboard className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No clips yet</p>
          <p className="mt-1.5 text-xs text-zinc-500 max-w-md mx-auto">
            Import a link or upload from the + button. Saved on this device until server storage is connected.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
