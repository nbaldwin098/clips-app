import { useMemo, useEffect } from 'react'
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

      <div className="px-5 md:px-8 py-8 max-w-[1600px] mx-auto w-full space-y-8">
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

      {continueItems.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold text-white mb-3">Continue watching</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
            {continueItems.slice(0, 8).map((item) => (
              <ContentCard key={item.id} item={item} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant="video" />
            ))}
          </div>
        </section>
      )}

      {following.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold text-white mb-3">Following</h2>
          <MediaShelves items={following.slice(0, 12)} onPlayItem={onPlayItem} onOpenPic={onOpenPic} onOpenProfile={onOpenProfile} />
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
