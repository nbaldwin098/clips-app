function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#141414]">
      {title ? <h2 className="px-4 pt-3.5 text-[13px] font-semibold text-zinc-100">{title}</h2> : null}
      <div className="p-4 pt-3">{children}</div>
    </section>
  )
}

function Kpi({ label, value, hint }) {
  return (
    <Card>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tabular-nums leading-none text-zinc-100">{value}</p>
      <div className="mt-3 h-[3px] rounded-full bg-white/10" />
      <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>
    </Card>
  )
}

export default function AdminDeck({
  users = 0,
  creators = 0,
  posts = 0,
  live = 0,
  watching = 0,
  reports = 0,
  revenueUsd = 0,
  pendingPayoutsUsd = 0,
}) {
  const money = (n) => `$${Number(n || 0).toFixed(2)}`
  return (
    <div className="space-y-3 text-zinc-200">
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-100">Admin</h1>
      <p className="text-[13px] text-zinc-500">Platform overview. Counts come from live data only.</p>

      <Card>
        <div className="flex flex-wrap items-end gap-8">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-red-600' : 'bg-zinc-600'}`} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              {live ? 'Live' : 'Lobby idle'}
            </span>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Live now</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{live}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Watching</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{watching}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Open reports</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{reports}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Pending payouts</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{money(pendingPayoutsUsd)}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Users" value={String(users)} hint="Accounts on calabi" />
        <Kpi label="Creators" value={String(creators)} hint="Approved channels" />
        <Kpi label="Posts" value={String(posts)} hint="Public catalog" />
        <Kpi label="Revenue · 28d" value={money(revenueUsd)} hint="Stripe, after fees" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Live lobby">
          <p className="text-[13px] text-zinc-500">{live ? `${live} live` : 'No one is live.'}</p>
        </Card>
        <Card title="Reports">
          <p className="text-[13px] text-zinc-500">{reports ? `${reports} open` : 'No open reports.'}</p>
        </Card>
        <Card title="Payouts">
          <p className="text-[13px] text-zinc-500">
            {pendingPayoutsUsd ? money(pendingPayoutsUsd) : 'No payouts queued.'}
          </p>
        </Card>
      </div>
    </div>
  )
}
