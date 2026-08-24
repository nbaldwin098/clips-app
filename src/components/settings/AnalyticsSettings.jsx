export default function AnalyticsSettings({ onNavigate }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Channel stats appear after real watches. This page does not invent numbers.
        </p>
      </div>
      <p className="text-sm text-zinc-400">
        Studio analytics (when you have posted content) is under Analytics in the left nav.
      </p>
      <button type="button" onClick={() => onNavigate?.('analytics')} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
        Open analytics
      </button>
    </div>
  )
}
