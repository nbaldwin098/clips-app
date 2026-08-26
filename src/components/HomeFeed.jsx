import { useMemo, useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStableHomeFeed, getStableFollowingFeed, getWatchItem } from '../lib/contentService'
import { listContinueWatching } from '../lib/watchProgress'
import { getActivePromotion, recordPromoClick } from '../lib/promotions'
import MediaShelves from './MediaShelves'
import ContentCard from './ContentCard'
import Footer from './Footer'
import HourlyHitsCarousel from './HourlyHitsCarousel'
import { preloadPostedItem, preloadPostedItems } from '../lib/preloadMedia'
import { useContentSyncTick } from '../lib/useContentSync'
import { isCatalogHydrated } from '../lib/catalogStore'
import { syncContentFromCloud } from '../lib/contentSync'

export default function HomeFeed({ onPlayItem, onOpenPic, onOpenProfile, onNavigate }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const hydrated = isCatalogHydrated()
  const items = useMemo(() => getStableHomeFeed(user?.id || null), [user?.id, syncTick])
  const following = useMemo(() => getStableFollowingFeed(user?.id || null), [user?.id, syncTick])
  const promo = useMemo(() => getActivePromotion(), [syncTick])
  const featured = useMemo(() => {
    const id = promo?.featureContentId || (promo?.destView === 'watch' ? promo.destId : '')
    return id ? getWatchItem(id) : null
  }, [promo, syncTick])
  const continueItems = useMemo(() => {
    if (!user?.id) return []
    return listContinueWatching(user.id).map((row) => getWatchItem(row.contentId)).filter((i) => i && i.type === 'video')
  }, [user?.id, syncTick])

  // Ensure a catalog pull starts even if App's interval hasn't fired yet.
  useEffect(() => {
    syncContentFromCloud(user).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    preloadPostedItem(featured)
    preloadPostedItems(continueItems, 2)
    preloadPostedItems(items, 6)
  }, [featured, continueItems, items])

  return (
    <div className="w-full">
      <HourlyHitsCarousel onPlayItem={onPlayItem} onOpenPic={onOpenPic} onOpenProfile={onOpenProfile} />
      <div className="px-4 md:px-6 py-4 max-w-[1600px] mx-auto w-full space-y-6">
      {promo && promo.placement === 'home' && (
        <button
          type="button"
          onClick={() => {
            recordPromoClick(promo.id)
            if (featured) onPlayItem?.(featured)
            else onNavigate?.(promo.destView || 'home', promo.destId || '')
          }}
          className="relative w-full text-left overflow-hidden rounded-2xl min-h-[120px] border border-[#272727]"
        >
          {featured?.thumbUrl ? (
            <img src={featured.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a]" />
          )}
          <div className="relative p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Featured</p>
            <p className="text-lg font-semibold text-white mt-1">{promo.headline}</p>
            {promo.body ? <p className="text-sm text-zinc-300 mt-1 max-w-xl">{promo.body}</p> : null}
          </div>
        </button>
      )}

      {featured && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Featured</h2>
          <div className="max-w-md">
            <ContentCard item={featured} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant={featured.type === 'short' ? 'short' : 'video'} />
          </div>
        </section>
      )}

      {continueItems.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Continue watching</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 chip-scroll">
            {continueItems.slice(0, 8).map((item) => (
              <div key={item.id} className="w-[260px] sm:w-[280px] shrink-0">
                <ContentCard item={item} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant="video" />
              </div>
            ))}
          </div>
        </section>
      )}

      {following.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Following</h2>
          <MediaShelves items={following.slice(0, 12)} onPlayItem={onPlayItem} onOpenPic={onOpenPic} onOpenProfile={onOpenProfile} />
        </section>
      )}

      {!hydrated ? (
        <div className="rounded-2xl border border-[#272727] bg-[#0f0f0f] px-6 py-16 text-center">
          <p className="text-sm font-medium text-zinc-400">Loading posts…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#272727] bg-[#0f0f0f] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No posts yet</p>
        </div>
      ) : (
        <MediaShelves items={items} onPlayItem={onPlayItem} onOpenPic={onOpenPic} onOpenProfile={onOpenProfile} />
      )}
      <Footer onNavigate={onNavigate} />
      </div>
    </div>
  )
}
