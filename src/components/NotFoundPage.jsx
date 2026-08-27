import { Home, Compass, Clapperboard, Plus } from 'lucide-react'

export default function NotFoundPage({ onNavigate }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 min-h-[60vh] bg-[#000000]">
      <div className="max-w-md text-center">
        <p className="text-6xl font-semibold text-zinc-800 tracking-tight">404</p>
        <h1 className="mt-4 text-lg font-semibold text-zinc-100">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          That screen does not exist or the link is broken. Go back to Recommended on the home feed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate('home') : (window.location.href = '/'))}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('explore')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-zinc-800 bg-[#121218] text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            <Compass className="h-4 w-4" />
            Search
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('clips')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-zinc-800 bg-[#121218] text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            <Clapperboard className="h-4 w-4" />
            Clips
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('create')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-zinc-800 bg-[#121218] text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
