import { Upload, Radio, Film, Settings, BarChart3, Sparkles } from 'lucide-react'
import { ALGORITHM_META } from '../lib/algorithmEngine'

export default function CreatorDashboard({ onOpenImport, onOpenCostSim }) {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Creator Studio</h1>
      <p className="text-sm text-slate-500 mb-8">
        Unified management for shorts, long-form video, and live streams.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onOpenImport}
          className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white text-left hover:border-[#2C729B]/40 hover:shadow-md transition-all card-lift"
        >
          <div className="h-10 w-10 rounded-xl bg-[#EBF4FA] flex items-center justify-center text-[#2C729B]">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Import Short</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Paste a TikTok, YouTube Shorts, or Instagram Reels link. Cross-post detection runs automatically. Zero binary storage.
            </p>
          </div>
        </button>

        <button
          onClick={onOpenCostSim}
          className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white text-left hover:border-[#2C729B]/40 hover:shadow-md transition-all card-lift"
        >
          <div className="h-10 w-10 rounded-xl bg-[#EBF4FA] flex items-center justify-center text-[#2C729B]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Infrastructure</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Cost simulator for Backblaze B2 and zero-storage reference modes.
            </p>
          </div>
        </button>

        <div className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Upload studio</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Client-side compression to 720p vertical before any network request. Next iteration.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200/80 bg-white">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Go live</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Stream key generation (RTMP / SRT) and low-latency ingest. Configure under Settings → Stream.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-[#2C729B]" />
          <h2 className="text-sm font-semibold text-slate-900">{ALGORITHM_META.name}</h2>
        </div>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          {ALGORITHM_META.principles.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Platform foundations</h2>
        </div>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>Dual-role accounts (viewer / creator mode)</li>
          <li>90/10 ad revenue pool by impression share</li>
          <li>On-top transaction fee for subscriptions and tips</li>
          <li>Cloudflare edge caching for media delivery</li>
          <li>Backblaze B2 compatible object storage path</li>
          <li>Cross-platform importer with cross-post detection</li>
          <li>DMCA notice-and-takedown (no proactive Content ID)</li>
        </ul>
      </section>
    </div>
  )
}
