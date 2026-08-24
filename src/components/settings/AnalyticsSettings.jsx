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
        The creator portal is Overview (views, likes, mix) and a Posts table. Open it from here or from Analytics in the profile menu.
      </p>
      <button type="button" onClick={() => onNavigate?.('analytics')} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
        Open analytics
      </button>
    </div>
  )
}
