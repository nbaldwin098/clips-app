export default function AboutPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">About Clips</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          On big platforms, people come for the app — not for you. Clips is built so{' '}
          <strong className="font-semibold text-slate-800">the audience comes to the creator</strong>
          . Follow for free. Subscribe only if they want extras. You keep 100% of the membership price
          you set.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Why this is different from YouTube</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-slate-800">YouTube builds customers for YouTube.</strong> Search,
            homepage, and recommendations keep people inside their product. Your channel is a stop
            along the way.
          </li>
          <li>
            <strong className="text-slate-800">Clips helps you build fans for yourself.</strong> Your
            share link, your membership, your imports from elsewhere — the relationship points at you,
            not at a homepage feed owned by someone else.
          </li>
          <li>
            <strong className="text-slate-800">Follow is free. Subscribe is optional.</strong> Fans who
            just want to keep up pay nothing. Anything extra is a clear paid choice — and the list price
            goes to you.
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">How money works</h2>
        <p>
          You set the monthly price (e.g. $4.99). You receive that full amount. The buyer pays a small
          processing fee on top. We don’t take a cut of your list price.
        </p>
        <p>
          Discovery ranks by real watch signals — completion, rewatches, shares — not by how many
          followers you already have.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Product principles</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>No fabricated creators or fake view counts</li>
          <li>Import by link so you’re not re-uploading everything</li>
          <li>DMCA notice-and-takedown (no proactive Content ID)</li>
          <li>Watch without an account; sign in to post, comment, upload, or go live</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Contact</h2>
        <p>DMCA: copyright@platform.internal</p>
        <p className="mt-1">Counter-notice: dmca-counter@platform.internal</p>
      </section>
    </div>
  )
}
