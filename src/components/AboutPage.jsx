export default function AboutPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">About Clips</h1>
        <p className="mt-2 text-sm text-[#adadb8] leading-relaxed">
          Clips is built so{' '}
          <strong className="font-semibold text-white">the audience comes directly to the creator</strong>
          . Follow for free. Subscribe only if you want extras. Creators keep 100% of their membership price.
        </p>
      </div>

      <section className="rounded-2xl border border-[#26262c] bg-[#18181b] p-5 space-y-3 text-sm text-[#adadb8]">
        <h2 className="text-sm font-semibold text-white">How money works</h2>
        <p>
          Creators set the monthly price and receive the full amount. The buyer pays processing fees on top.
        </p>
        <p>
          Discovery ranks by real watch signals — completion, rewatches, and shares — never follower count.
        </p>
      </section>

      <section className="rounded-2xl border border-[#26262c] bg-[#18181b] p-5 space-y-3 text-sm text-[#adadb8]">
        <h2 className="text-sm font-semibold text-white">Product principles</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>No fabricated creators or fake view counts</li>
          <li>Import by link or upload directly</li>
          <li>DMCA notice-and-takedown</li>
          <li>Watch without an account; sign in to post, comment, upload, or go live</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[#26262c] bg-[#18181b] p-5 text-sm text-[#adadb8]">
        <h2 className="text-sm font-semibold text-white mb-2">Contact</h2>
        <p>DMCA: copyright@platform.internal</p>
        <p className="mt-1">Counter-notice: dmca-counter@platform.internal</p>
      </section>
    </div>
  )
}
