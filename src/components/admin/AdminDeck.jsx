function Card({ title, action, children, onClick }) {
  const inner = (
    <>
      {(title || action) ? (
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-1">
          <h2 className="text-[13px] font-semibold text-zinc-100">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="p-4 pt-3">{children}</div>
    </>
  )
  const cls = 'rounded-xl border border-white/10 bg-[#141414] text-left w-full'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} hover:bg-[#1a1a1a]`}>
        {inner}
      </button>
    )
  }
  return <section className={cls}>{inner}</section>
}

function Kpi({ label, value, hint, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-white/10 bg-[#141414] p-4 text-left hover:bg-[#1a1a1a]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tabular-nums leading-none text-zinc-100">{value}</p>
      <div className="mt-3 h-px bg-white/10" />
      <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>
    </button>
  )
}

function EmptyTable({ columns, message }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500">
            {columns.map((c) => <th key={c} className="py-2 pr-3 font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} className="py-6 text-zinc-500">{message}</td>
          </tr>
        </tbody>
      </table>
    </div>
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
  onOpen,
}) {
  const money = (n) => `$${Number(n || 0).toFixed(2)}`
  const open = (id) => () => onOpen?.(id)
  return (
    <div className="space-y-3 text-zinc-200">
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-100">COO</h1>
      <p className="text-[13px] text-zinc-500">Platform overview. Tables are the queues. Counts come from live data only.</p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Users" value={String(users)} hint="Accounts on calabi" onClick={open('people')} />
        <Kpi label="Creators" value={String(creators)} hint="Approved channels" onClick={open('applications')} />
        <Kpi label="Reports" value={String(reports)} hint="Open tickets / reports" onClick={open('tickets')} />
        <Kpi label="Revenue · 28d" value={money(revenueUsd)} hint="Stripe, after fees" onClick={open('finance')} />
      </div>

      <Card title="Live lobby" action={<button type="button" onClick={open('live')} className="text-[12px] font-medium text-zinc-300">Open</button>}>
        <div className="mb-3 flex flex-wrap items-end gap-8">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-red-600' : 'bg-zinc-600'}`} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{live ? 'Live' : 'Lobby idle'}</span>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Live now</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{live}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Watching</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{watching}</p>
          </div>
        </div>
        <EmptyTable columns={['Streamer', 'Title', 'Viewers', 'Started']} message={live ? `${live} live — open lobby` : 'No one is live. Rows appear from ingest.'} />
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Support" action={<button type="button" onClick={open('tickets')} className="text-[12px] font-medium text-zinc-300">Open</button>}>
          <EmptyTable columns={['Subject', 'Status']} message={reports ? `${reports} open` : 'No open tickets.'} />
        </Card>
        <Card title="Payouts" action={<button type="button" onClick={open('payouts')} className="text-[12px] font-medium text-zinc-300">Open</button>}>
          <EmptyTable columns={['Creator', 'Amount', 'Status']} message={pendingPayoutsUsd ? money(pendingPayoutsUsd) : 'No payouts queued.'} />
        </Card>
      </div>
    </div>
  )
}
