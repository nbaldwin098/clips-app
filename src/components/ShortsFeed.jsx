import { Clapperboard, Upload } from 'lucide-react'

export default function ShortsFeed({ onOpenImport }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-white">
      <div className="text-center px-6 max-w-md">
        <Clapperboard className="mx-auto h-12 w-12 text-slate-300" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Shorts feed is empty</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          The meritocratic discovery engine only ranks real engagement signals.
          No placeholder or fabricated shorts are displayed. Import or upload content to begin.
        </p>
        <button
          onClick={onOpenImport}
          className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
        >
          <Upload className="h-4 w-4" />
          Import Short
        </button>
      </div>
    </div>
  )
}
