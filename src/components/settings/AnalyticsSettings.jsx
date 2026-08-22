export default function AnalyticsSettings() {
  const cards = [
    { label: 'Watch hours (30d)', value: '0' },
    { label: 'Avg. concurrent', value: '0' },
    { label: 'New followers', value: '0' },
    { label: 'Subscriber net', value: '0' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Channel performance appears after real traffic is recorded. No fabricated metrics.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Retention</h2>
        <div className="h-32 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
          Retention curve placeholder — requires real view timelines
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Traffic sources</h2>
        <p className="text-sm text-slate-500">Browse, search, external, and notification sources will list here.</p>
      </section>
    </div>
  )
}
