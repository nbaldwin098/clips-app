import { useState, useMemo } from 'react'
import { Heart, MessageCircle, Share2, Bookmark, Info } from 'lucide-react'
import { SHORTS, getCreator, formatCount } from '../data/content'
import { rankShorts, computeEngagementScore } from '../lib/algorithmEngine'
import { cn } from '../lib/utils'

export default function ShortsFeed() {
  const ranked = useMemo(() => rankShorts(SHORTS), [])
  const [index, setIndex] = useState(0)
  const [showSignals, setShowSignals] = useState(false)

  const current = ranked[index]
  const creator = getCreator(current?.creatorId)
  const score = current ? computeEngagementScore(current.engagement) : 0

  const next = () => setIndex(i => Math.min(i + 1, ranked.length - 1))
  const prev = () => setIndex(i => Math.max(i - 1, 0))

  if (!current) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-slate-500">
        No shorts available.
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] bg-slate-900 flex items-center justify-center">
      <div className="relative w-full max-w-[420px] h-full max-h-[780px] bg-black rounded-none sm:rounded-2xl overflow-hidden shadow-2xl">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: current.thumbnailColor }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/70 text-sm px-6 text-center">
            {current.title}
          </p>
        </div>

        <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
          <div className="flex justify-end pointer-events-auto">
            <button
              onClick={() => setShowSignals(s => !s)}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-end justify-between pointer-events-auto">
            <div className="max-w-[70%] text-white">
              <p className="font-semibold text-sm">@{creator?.handle}</p>
              <p className="text-sm mt-1 line-clamp-2 opacity-90">{current.title}</p>
              <p className="text-xs mt-2 opacity-70">{formatCount(current.views)} views</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <button className="flex flex-col items-center text-white">
                <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center">
                  <Heart className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1">{formatCount(current.likes)}</span>
              </button>
              <button className="flex flex-col items-center text-white">
                <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1">{formatCount(current.engagement?.comments || 0)}</span>
              </button>
              <button className="flex flex-col items-center text-white">
                <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center">
                  <Share2 className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1">{formatCount(current.engagement?.shares || 0)}</span>
              </button>
              <button className="flex flex-col items-center text-white">
                <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center">
                  <Bookmark className="h-5 w-5" />
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto pr-2">
          <button
            onClick={prev}
            disabled={index === 0}
            className="h-8 w-8 rounded-full bg-black/40 text-white text-xs disabled:opacity-30"
          >
            Up
          </button>
          <button
            onClick={next}
            disabled={index === ranked.length - 1}
            className="h-8 w-8 rounded-full bg-black/40 text-white text-xs disabled:opacity-30"
          >
            Dn
          </button>
        </div>
      </div>

      {showSignals && (
        <div className="absolute top-4 right-4 w-72 rounded-xl bg-white border border-slate-200 shadow-xl p-4 z-20">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Engagement signals</h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">Score</dt>
              <dd className="font-medium text-slate-900">{score}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tier</dt>
              <dd className="font-medium text-slate-900">{current.tier?.name} ({current.tier?.size})</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Completion</dt>
              <dd className="font-medium">{(current.engagement.completionRate * 100).toFixed(0)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Avg loops</dt>
              <dd className="font-medium">{current.engagement.loops.toFixed(1)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Early skip rate</dt>
              <dd className="font-medium">{(current.engagement.earlySkips * 100).toFixed(0)}%</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Ranking uses only engagement velocity. Follower count is excluded.
          </p>
        </div>
      )}
    </div>
  )
}
