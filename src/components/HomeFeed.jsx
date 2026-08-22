import { Radio, Film, Upload } from 'lucide-react'

export default function HomeFeed({ onNavigate, onOpenImport }) {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Live now</h2>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
          <Radio className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">No live broadcasts</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            When creators go live, their streams will appear here with real-time viewer counts.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recommended</h2>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
          <Film className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">No videos yet</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            The feed stays empty until real content is uploaded or imported. No demo or placeholder media is shown.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
            >
              <Upload className="h-4 w-4" />
              Import Short
            </button>
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Creator Studio
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
