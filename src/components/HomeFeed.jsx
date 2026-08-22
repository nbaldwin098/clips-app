import { Radio, Film, Upload, Sparkles } from 'lucide-react'

export default function HomeFeed({ onNavigate, onOpenImport }) {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Live now</h2>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#EBF4FA] flex items-center justify-center">
            <Radio className="h-6 w-6 text-[#2C729B]" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-800">No live broadcasts yet</p>
          <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            When creators go live, streams appear here with real viewer counts. Nothing is fabricated.
          </p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recommended</h2>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#EBF4FA] flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-[#2C729B]" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-800">Your feed is ready</p>
          <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Discovery ranks purely on completion, rewatches, and shares — the same signals that made early TikTok fun.
            No follower bias. Import or upload real content to start.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82] transition-colors shadow-sm"
            >
              <Upload className="h-4 w-4" />
              Import Short
            </button>
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Film className="h-4 w-4" />
              Creator Studio
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
