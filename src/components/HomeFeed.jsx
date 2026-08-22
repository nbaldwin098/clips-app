import { VIDEOS, LIVE_STREAMS, getCreator, formatCount, formatDuration } from '../data/content'
import { Radio } from 'lucide-react'

function VideoCard({ video, onSelect }) {
  const creator = getCreator(video.creatorId)
  return (
    <button
      onClick={() => onSelect?.(video)}
      className="group text-left w-full"
    >
      <div
        className="relative aspect-video rounded-xl overflow-hidden bg-slate-200"
        style={{ backgroundColor: video.thumbnailColor }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/80 text-xs font-medium px-2 py-1 rounded bg-black/40">
            {formatDuration(video.duration)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
          {creator?.displayName?.[0] || '?'}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug group-hover:text-[#2C729B]">
            {video.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{creator?.displayName}</p>
          <p className="text-xs text-slate-500">
            {formatCount(video.views)} views
          </p>
        </div>
      </div>
    </button>
  )
}

function LiveCard({ stream }) {
  const creator = getCreator(stream.creatorId)
  return (
    <div className="group">
      <div
        className="relative aspect-video rounded-xl overflow-hidden"
        style={{ backgroundColor: stream.thumbnailColor }}
      >
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2C729B] text-white text-xs font-semibold">
          <Radio className="h-3 w-3" />
          LIVE
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
          {formatCount(stream.viewers)} watching
        </div>
      </div>
      <div className="mt-2 flex gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
          {creator?.displayName?.[0] || '?'}
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-900 line-clamp-2">{stream.title}</h3>
          <p className="text-xs text-slate-500">{creator?.displayName}</p>
          <p className="text-xs text-slate-500">{stream.category}</p>
        </div>
      </div>
    </div>
  )
}

export default function HomeFeed({ onSelectVideo }) {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Live now</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {LIVE_STREAMS.map(s => (
            <LiveCard key={s.id} stream={s} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recommended</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
          {VIDEOS.map(v => (
            <VideoCard key={v.id} video={v} onSelect={onSelectVideo} />
          ))}
        </div>
      </section>
    </div>
  )
}
