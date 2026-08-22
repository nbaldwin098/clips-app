import { Clapperboard, Upload } from 'lucide-react'

export default function ShortsFeed({ onOpenImport }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-[#FAFCFF]">
      <div className="text-center px-6 max-w-md">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#EBF4FA] flex items-center justify-center">
          <Clapperboard className="h-7 w-7 text-[#2C729B]" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-slate-900">Shorts feed is empty</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          The algorithm only ranks real engagement velocity: completion, loops, shares, and early-skip penalties.
          Follower count is ignored. Import a short to begin seed testing.
        </p>
        <button
          onClick={onOpenImport}
          className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82] transition-colors shadow-sm"
        >
          <Upload className="h-4 w-4" />
          Import Short
        </button>
      </div>
    </div>
  )
}
