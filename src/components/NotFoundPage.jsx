import { Home } from 'lucide-react'

export default function NotFoundPage({ onNavigate }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 min-h-[50vh]">
      <div className="max-w-md text-center">
        <p className="text-5xl font-semibold text-slate-200 tracking-tight">404</p>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          That view does not exist. Head home or open Explore to browse the legal library.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.('home')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#2C729B] text-white text-sm font-medium hover:bg-[#245F82]"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('explore')}
            className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Explore
          </button>
        </div>
      </div>
    </div>
  )
}
