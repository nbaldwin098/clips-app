import { useMemo } from 'react'
import { Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getShortsFeed } from '../lib/contentService'
import ContentCard from './ContentCard'

export default function ShortsFeed({ onOpenImport }) {
  const { user } = useAuth()
  const items = useMemo(() => getShortsFeed(user?.id || null), [user?.id])

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Shorts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vertical clips from the legal library and your imports
          </p>
        </div>
        <button
          onClick={onOpenImport}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
        >
          <Upload className="h-4 w-4" />
          Import Short
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
