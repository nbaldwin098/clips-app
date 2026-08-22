import { LIVE_STREAMS, getCreator, formatCount } from '../data/content'
import { Radio, MessageSquare, Users } from 'lucide-react'

export default function LiveView() {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Live broadcasts</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {LIVE_STREAMS.map(stream => {
          const creator = getCreator(stream.creatorId)
          return (
            <div key={stream.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div
                className="aspect-video relative"
                style={{ backgroundColor: stream.thumbnailColor }}
              >
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2C729B] text-white text-xs font-semibold">
                  <Radio className="h-3.5 w-3.5" />
                  LIVE
                </div>
                <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
                  {formatCount(stream.viewers)} viewers
                </div>
              </div>
              <div className="p-4">
                <h2 className="text-sm font-semibold text-slate-900 line-clamp-2">{stream.title}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                    {creator?.displayName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{creator?.displayName}</p>
                    <p className="text-xs text-slate-500">{stream.category}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 h-9 rounded-lg bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]">
                    Watch
                  </button>
                  <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
