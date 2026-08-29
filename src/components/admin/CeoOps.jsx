import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { lsGet, lsSet } from '../../lib/storage'

const OPS = [
  'Approve or reject pending creator applications',
  'Review open support tickets',
  'Check reports / DMCA inbox (copyright@calabi.us)',
  'Confirm Render deploy is green after Manual Deploy',
  'Spot-check feed for stolen or abusive content',
  'Verify storage usage',
  'Review the live promo banner',
]

const DOCS = [
  { id: 'tos', title: 'Terms of Service', body: 'calabi.us is the product. Accounts, content, and live are governed here. We can remove stolen or abusive material. legal@calabi.us' },
  { id: 'privacy', title: 'Privacy Policy', body: 'We store the account you create, the media you upload, and payment records Stripe already holds. privacy@calabi.us' },
  { id: 'creator', title: 'Creator Agreement', body: 'Creators keep 80% of tips and premium after Stripe fees. Payouts are marked paid by ops. You own your content; you grant calabi a license to host it.' },
  { id: 'guidelines', title: 'Community Guidelines', body: 'No CSAM, no stolen VODs as your own, no raids that exist to harass. Appeals: support@calabi.us' },
  { id: 'dmca', title: 'Copyright & DMCA', body: 'copyright@calabi.us. Repeat infringement loses the channel.' },
]

export default function CeoOps() {
  const [checks, setChecks] = useState(() => lsGet('calabi_ceo_ops', OPS.map(() => false)))
  const [open, setOpen] = useState('')
  const [hypo, setHypo] = useState('100')

  useEffect(() => { lsSet('calabi_ceo_ops', checks) }, [checks])
  const done = (checks || []).filter(Boolean).length
  const gross = Number(hypo) || 0

  const systems = [
    ['Auth', 'Owner-gated', 'Public sign-in is not live. Owner session works.'],
    ['Stripe', 'Connected · $0', 'No charges booked. 80/20 split is wired.'],
    ['Live ingest', 'Owned', 'GCP + Cloudflare. RTMP rtmp://live.calabi.us/app'],
    ['Ads', 'Off', 'Advertiser desk is draft-only. Feed does not inject ads.'],
    ['Legal', '4 docs', 'TOS, privacy, creator, guidelines.'],
    ['calabi.us', 'Manual Deploy', 'GitHub is pushed. You still click Manual Deploy + clear cache.'],
  ]

  return (
    <div className="p-5 space-y-4 text-zinc-200">
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-100">CEO</h1>
      <p className="text-[13px] text-zinc-500">Launch board. Honest status. No invented revenue.</p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Ops done</p>
          <p className="mt-2 text-[28px] font-semibold tabular-nums">{done}/{OPS.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Revenue · 28d</p>
          <p className="mt-2 text-[28px] font-semibold tabular-nums">$0.00</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Live ingest</p>
          <p className="mt-2 text-[28px] font-semibold">Owner</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#141414] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Legal</p>
          <p className="mt-2 text-[28px] font-semibold">4 docs</p>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#141414] p-4">
        <h2 className="text-[13px] font-semibold text-zinc-100 mb-3">Systems</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="py-2 pr-3 font-semibold">System</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {systems.map(([n, s, note]) => (
                <tr key={n} className="border-t border-white/10">
                  <td className="py-2 pr-3">{n}</td>
                  <td className="py-2 pr-3">{s}</td>
                  <td className="py-2 text-zinc-500">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#141414] p-4">
        <h2 className="text-[13px] font-semibold text-zinc-100 mb-2">Ops checklist</h2>
        <ul className="space-y-1">
          {OPS.map((item, i) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => setChecks((c) => (c || OPS.map(() => false)).map((v, idx) => (idx === i ? !v : v)))}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5"
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded border ${checks[i] ? 'border-emerald-400 bg-emerald-400/20' : 'border-white/15'}`}>
                  {checks[i] ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : null}
                </span>
                {item}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#141414] p-4 space-y-2">
        <h2 className="text-[13px] font-semibold text-zinc-100">Treasury</h2>
        <p className="text-[32px] font-semibold tabular-nums">$0.00</p>
        <p className="text-[12px] text-zinc-500">Booked. Stays $0 until a real Stripe charge. Hypothetical split only:</p>
        <input value={hypo} onChange={(e) => setHypo(e.target.value)} className="h-10 w-40 rounded-lg border border-white/10 bg-black px-3 text-sm" />
        <p className="text-[13px] text-zinc-400">Creator 80% ${ (gross * 0.8).toFixed(2) } · Platform 20% ${ (gross * 0.2).toFixed(2) }</p>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#141414] p-4 space-y-2">
        <h2 className="text-[13px] font-semibold text-zinc-100">Legal</h2>
        {DOCS.map((d) => (
          <div key={d.id} className="border-t border-white/10 pt-2">
            <button type="button" className="text-sm font-medium" onClick={() => setOpen(open === d.id ? '' : d.id)}>{d.title}</button>
            {open === d.id ? <p className="mt-1 text-[13px] text-zinc-500 leading-relaxed">{d.body}</p> : null}
          </div>
        ))}
        <p className="text-[11px] text-zinc-600 pt-2">legal@calabi.us · copyright@calabi.us · privacy@calabi.us</p>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#141414] p-4">
        <h2 className="text-[13px] font-semibold text-zinc-100 mb-2">Org</h2>
        <dl className="space-y-1 text-[13px]">
          <div className="flex justify-between"><dt className="text-zinc-500">Owner</dt><dd>kiddnixk</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">Domain</dt><dd>calabi.us</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">Support</dt><dd>support@calabi.us</dd></div>
        </dl>
      </section>
    </div>
  )
}
