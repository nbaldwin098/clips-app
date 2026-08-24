import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import { getPicHearts } from '../lib/picHearts'
import { getById, getWatchItem } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import PageHeader from './PageHeader'
import { pickImmediatePhotoSrc } from '../lib/picsService'

function HeartedPicTile({ pic, onOpen }) {
  const src = pickImmediatePhotoSrc(pic, { full: false }) || pic.thumbUrl || pic.mediaUrl
  return (
    <button
      type="button"
      onClick={() => onOpen?.(pic)}
      className="relative block w-full aspect-square overflow-hidden bg-zinc-800 group focus:outline-none"
    >
      {src ? (
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div className="absolute inset-0 bg-zinc-800" />
      )}
      <span className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-red-400">
        <Heart className="h-4 w-4 fill-current" />
      </span>
    </button>
  )
}

export default function HeartsPage({ onNavigate, onOpenPic }) {
  const syncTick = useContentSyncTick()
  const pics = useMemo(() => {
    return getPicHearts()
      .map((id) => getWatchItem(id) || getById(id))
      .filter((i) => i?.type === 'pic')
  }, [syncTick])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Hearts" onBack={() => onNavigate?.('home')} />
      <p className="text-xs text-zinc-500 mb-6">Pictures you hearted while browsing Pics.</p>

      {pics.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <Heart className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">No hearted pics yet</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Hover a pic in the mosaic or open the viewer and tap the heart.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('pics')}
            className="mt-4 h-9 px-4 rounded-lg bg-white text-black text-sm font-semibold"
          >
            Browse pics
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
          {pics.map((pic) => (
            <HeartedPicTile key={pic.id} pic={pic} onOpen={onOpenPic} />
          ))}
        </div>
      )}
    </div>
  )
}
