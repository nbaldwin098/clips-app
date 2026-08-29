import { useMemo, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStableHomeFeed, getStableFollowingFeed, getWatchItem } from '../lib/contentService'
import { getPicsFeed } from '../lib/picsService'
import { listContinueWatching } from '../lib/watchProgress'
import { getActivePromotion, recordPromoClick } from '../lib/promotions'
import MediaShelves from './MediaShelves'
import ContentCard from './ContentCard'
import Footer from './Footer'
import ApexHomeStage from './home/ApexHomeStage'
import { preloadPostedItem, preloadPostedItems } from '../lib/preloadMedia'
import { useContentSyncTick } from '../lib/useContentSync'
import { isCatalogHydrated } from '../lib/catalogStore'
import { syncContentFromCloud } from '../lib/contentSync'
import { lsGet } from '../lib/storage'
import { listOnAirBoard } from '../lib/liveStatus'
import { mergeDemoLiveBoard } from '../data/demoLiveStreams'


function ThreeCarousel({ title, children }) {
  const ref = useRef(null)
  const move = (dir) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.9, 240), behavior: 'smooth' })
  }
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous" onClick={() => move(-1)} className="h-8 w-8 inline-flex items-center justify-center border border-white/20 text-white hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next" onClick={() => move(1)} className="h-8 w-8 inline-flex items-center justify-center border border-white/20 text-white hover:bg-white/10">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  )
}

export default function HomeFeed({
  onPlayItem,
  onOpenPic,
  onOpenProfile,
  onNavigate,
  onOpenAuth,
  onOpenCheckout,
  onSelectLive,
}) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const hydrated = isCatalogHydrated()
  const items = useMemo(() => {
    const feed = getStableHomeFeed(user?.id || null)
    const pics = (getPicsFeed() || []).map((p) => ({ ...p, type: 'pic' }))
    const seen = new Set(feed.map((i) => i.id))
    const extra = pics.filter((p) => p?.id && !seen.has(p.id))
    return [...feed, ...extra]
  }, [user?.id, syncTick])
  const following = useMemo(() => getStableFollowingFeed(user?.id || null), [user?.id, syncTick])
  const promo = useMemo(() => getActivePromotion(), [syncTick])
  const featured = useMemo(() => {
    const id = promo?.featureContentId || (promo?.destView === 'watch' ? promo.destId : '')
    return id ? getWatchItem(id) : null
  }, [promo, syncTick])
  const onAir = useMemo(
    () => mergeDemoLiveBoard(listOnAirBoard(lsGet('live_board', []) || [])),
    [syncTick]
  )
  const continueItems = useMemo(() => {
    if (!user?.id) return []
    return listContinueWatching(user.id).map((row) => getWatchItem(row.contentId)).filter((i) => i && i.type === 'video')
  }, [user?.id, syncTick])
  const continueVideos = continueItems.length
    ? continueItems
    : (items || []).filter((i) => i && i.type === 'video').slice(0, 12)
  const continueLives = (onAir || []).slice(0, 12)

  useEffect(() => {
    syncContentFromCloud(user).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    preloadPostedItem(featured)
    preloadPostedItems(continueItems, 2)
    preloadPostedItems(items, 6)
  }, [featured, continueItems, items])

  return (
    <div className="w-full bg-black" data-home="apex">
      <ApexHomeStage
        onAir={onAir}
        onNavigate={onNavigate}
        onOpenProfile={onOpenProfile}
        onOpenAuth={onOpenAuth}
        onOpenCheckout={onOpenCheckout}
        onSelectLive={onSelectLive}
      />

      <div className="px-5 md:px-8 py-8 w-full space-y-8">
      {promo && promo.placement === 'home' && (
        <button
          type="button"
          onClick={() => {
            recordPromoClick(promo.id)
            if (featured) onPlayItem?.(featured)
            else onNavigate?.(promo.destView || 'home', promo.destId || '')
          }}
          className="relative w-full text-left overflow-hidden min-h-[96px] border border-white/10"
        >
          {featured?.thumbUrl ? (
            <img src={featured.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          ) : (
            <div className="absolute inset-0 bg-[#111]" />
          )}
          <div className="relative p-4">
            <p className="text-sm font-semibold text-white">{promo.headline}</p>
            {promo.body ? <p className="text-sm text-[#a0a0a0] mt-1 max-w-xl">{promo.body}</p> : null}
          </div>
        </button>
      )}

      <ThreeCarousel title="Continue watching · Videos">
        {continueVideos.map((item) => (
          <div key={item.id} className="w-[85%] sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] shrink-0 snap-start">
            <ContentCard item={item} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant="video" />
          </div>
        ))}
      </ThreeCarousel>

      <ThreeCarousel title="Continue watching · Live">
        {continueLives.map((s) => (
          <button
            key={s.userId}
            type="button"
            onClick={() => onSelectLive?.(s)}
            className="w-[85%] sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] shrink-0 snap-start text-left"
          >
            <div className="relative aspect-video overflow-hidden bg-[#141414]">
              {(s.thumbUrl || s.previewUrl) ? (
                <img src={s.thumbUrl || s.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : null}
              <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white bg-[#eb0400]">Live</span>
            </div>
            <p className="mt-2 text-base font-semibold text-white truncate">{s.title || 'Live'}</p>
            <p className="text-sm text-[#b3b3b3] truncate">{s.displayName || s.handle}</p>
          </button>
        ))}
      </ThreeCarousel>

      {following.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold text-white mb-3">Following</h2>
          <MediaShelves items={following.slice(0, 12)} filter="video" onPlayItem={onPlayItem} onOpenPic={onOpenPic} onOpenProfile={onOpenProfile} />
        </section>
      )}

      <section>
        <h2 className="text-[17px] font-semibold text-white mb-3">Recommended</h2>
        {!hydrated ? (
          <p className="text-sm text-[#8a8a8a] py-8">Loading posts…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[#8a8a8a] py-8">No videos yet.</p>
        ) : (
          <MediaShelves
            items={items}
            filter="video"
            onPlayItem={onPlayItem}
            onOpenPic={onOpenPic}
            onOpenProfile={onOpenProfile}
          />
        )}
      </section>

      <Footer onNavigate={onNavigate} />
      </div>
    </div>
  )
}
