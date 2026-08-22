export default function AboutPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">About Clips</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Clips is a vertical short-form, long-form, and live platform. Discovery ranks by real watch
          signals — completion, rewatches, shares — not follower count. Creators keep 100% of the
          subscription price they set; buyers pay processing fees on top.
        </p>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Product principles</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>No fabricated creators or fake view counts</li>
          <li>Legal library seeds from public-domain and open licenses only</li>
          <li>Zero raw master uploads — compress client-side or import by link</li>
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
