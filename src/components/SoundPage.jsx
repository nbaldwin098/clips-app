import { useMemo } from 'react'
import { Music } from 'lucide-react'
import { FREE_SOUNDS } from '../data/sounds'
import { listUserSounds } from '../lib/engagement'
import { getBySound } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import MediaShelves from './MediaShelves'
import PageHeader from './PageHeader'

function findSound(soundKey) {
  const key = String(soundKey || '')
  const library = [...FREE_SOUNDS, ...listUserSounds()]
  return library.find((s) => s.id === key || s.title === key) || null
}

export default function SoundPage({ soundKey, onNavigate, onPlayItem, onUseSound }) {
  const syncTick = useContentSyncTick()
  const sound = findSound(soundKey)
  const title = sound?.title || soundKey || 'Sound'
  const items = useMemo(
    () => getBySound(sound?.id || soundKey, sound?.title || soundKey),
    [sound?.id, sound?.title, soundKey, syncTick]
  )

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-5">
      <PageHeader title="Sound" onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 flex flex-wrap items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center">
          <Music className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {items.length} clip{items.length === 1 ? '' : 's'}
            {sound?.attribution ? ` · ${sound.attribution}` : ''}
            {sound?.category ? ` · ${sound.category}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onUseSound?.({ id: sound?.id || soundKey, title })}
          className="h-10 px-4 rounded-lg bg-white text-black text-sm font-bold"
        >
          Use this sound
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-16">No clips on this sound yet.</p>
      ) : (
        <MediaShelves items={items} onPlayItem={onPlayItem} />
      )}
    </div>
  )
}
