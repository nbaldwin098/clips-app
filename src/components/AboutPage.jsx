import BrandMark from './BrandMark'

export default function AboutPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <BrandMark size={48} word="calabi" wordClassName="text-xl font-semibold text-white" />
        <h1 className="sr-only">About Clips</h1>
        <p className="mt-2 text-sm text-[#adadb8] leading-relaxed">
          On big platforms, people come for the app — not for you. Clips is built so{' '}
          <strong className="font-semibold text-white">the audience comes to the creator</strong>
          . Follow is free. Paid membership is optional and only after Stripe charges. We do not invent
          viewers, balances, or a live picture.
        </p>
      </div>

      <section className="rounded-2xl border border-[#26262c] bg-[#18181b] p-5 space-y-3 text-sm text-[#adadb8]">
        <h2 className="text-sm font-semibold text-white">Why this is different from YouTube</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-white">YouTube builds customers for YouTube.</strong> Search and
            Home keep people inside their product. Your channel is a stop along the way.
          </li>
          <li>
            <strong className="text-white">Clips points the relationship at you.</strong> Your share
            link, your membership price, your uploads. Formats stay clean: 16:9 videos, 9:16 clips,
            quiet pics. No stories or DMs.
          </li>
          <li>
            <strong className="text-white">Follow is free. Pay is a real charge.</strong> Nothing
            unlocks premium from a bare Subscribe click.
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[#26262c] bg-[#18181b] p-5 space-y-3 text-sm text-[#adadb8]">
        <h2 className="text-sm font-semibold text-white">How money works today</h2>
        <p>
          Creators set a list price on Channel (default $5/mo). Checkout shows that price. A Stripe
          Payment Link is what actually charges a card. Premium is marked only after Stripe sends the
          buyer back.
        </p>
        <p>
          Payouts are not live. Wallet will not invent a balance or let anyone withdraw until Stripe
          Connect is connected. When that ships, the creator keeps the list price and the buyer pays
          the processing fee on top — not before.
        </p>
        <p>
          Discovery ranks by real watch signals — completion, rewatches, shares, skips — not follower
          count.
        </p>
      </section>

      <section className="rounded-2xl border border-[#26262c] bg-[#18181b] p-5 space-y-3 text-sm text-[#adadb8]">
        <h2 className="text-sm font-semibold text-white">Product principles</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>No fabricated creators or fake view counts</li>
          <li>Import by link so you’re not re-uploading everything</li>
          <li>DMCA notice-and-takedown (no proactive Content ID)</li>
          <li>Watch without an account; sign in to post, comment, upload, or list a live lobby</li>
          <li>Live video is not on yet — the Live page is a lobby, not a fake stream</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[#26262c] bg-[#18181b] p-5 text-sm text-[#adadb8]">
        <h2 className="text-sm font-semibold text-white mb-2">Contact</h2>
        <p>DMCA: copyright@calabi.us</p>
        <p className="mt-1">Support: use Help → Support on the site</p>
      </section>
    </div>
  )
}
