/** Branded watch placeholder — not a bare "Loading…" string. */
export default function WatchSkeleton() {
  return (
    <div className="pb-24" aria-busy="true" aria-label="Loading video">
      <div className="bg-[#050506] border-b border-white/[0.06]">
        <div className="relative w-full aspect-video max-h-[72vh] bg-[#141414] overflow-hidden">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-transparent to-white/5" />
          <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-500">calabi</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 md:px-6 mt-6 space-y-4">
        <div className="h-7 w-3/4 rounded bg-white/10 animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
          <div className="h-4 w-36 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
