import { ORG } from '../lib/orgConfig'

export default function HelpPage() {
  const faqs = [
    {
      q: 'How do I sign in?',
      a: 'Use email and password, a phone code, Apple, Microsoft, or X. CapCut cannot sign people in — export the file, then upload it here.',
    },
    {
      q: 'How do I upload or go live?',
      a: 'Open Create in the left sidebar (under Live). Upload a video, clip, or pic, or go live. Go Live opens a lobby listing; share an OBS window for video, or use Custom RTMP when an ingest URL is configured.',
    },
    {
      q: 'How do creators make money?',
      a: 'Tips, premium livestream membership, and Coins — not ads or RPM. Creators keep 80% of tips and memberships. Apply from Creator dashboard → Earnings for payouts. Coins packs and Orders history are under Site settings → Coins.',
    },
    {
      q: 'Can I donate on live or on a video?',
      a: 'Yes when Stripe Checkout is deployed. Pick $2–$25 or a custom amount ($1–$500). Nothing unlocks until Stripe sends you back. Live donations appear in chat.',
    },
    {
      q: 'Where is Studio, Coins, and analytics?',
      a: 'Open your profile picture → Creator dashboard. Site settings has Account and Coins (with Orders). Create is in the left sidebar — there is no header hamburger.',
    },
    {
      q: 'Can I watch without an account?',
      a: 'Yes. Sign in is required to comment, post, upload, or go live.',
    },
    {
      q: 'Does Recommended keep changing?',
      a: 'No. It is ranked when the page loads. Hard-refresh when you want a new mix.',
    },
    {
      q: 'Can I download a video or pic?',
      a: 'Yes. Use the menu on a card, the watch page, or a pic.',
    },
    {
      q: 'How do I get a checkmark?',
      a: 'Official library channels already have a check. Everyone else uploads ID photos from Creator dashboard → Get verified. Admin accepts or denies.',
    },
    {
      q: 'How do payouts and escrow work?',
      a: 'Payouts are manual until Stripe Connect ships. Live request tips stay held until fulfilled/released (target refund after 14 days if still held). Marketplace releases ~7 days after delivery. A chargeback or bank dispute may reverse Coins until Stripe closes the case.',
    },
    {
      q: 'How do I report copyright infringement?',
      a: `Email a complete DMCA notice to ${ORG.copyrightEmail}.`,
    },
    {
      q: 'Watch page keys?',
      a: 'k play/pause, j/l skip 10s, f fullscreen, m mute, c captions, n next, t theater, p picture-in-picture, 0–9 seek.',
    },
    {
      q: 'How do I contact support?',
      a: `Email ${ORG.supportEmail}. For Coins/Orders, include your account email, time, and Stripe receipt if you have one.`,
    },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-2">Help</h1>
      <p className="text-sm text-[#adadb8] mb-6">
        Common questions about watching and posting on calabi.us.
      </p>

      <div className="space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="rounded-xl border border-[#26262c] bg-[#18181b] px-4 py-3 group"
          >
            <summary className="text-sm font-medium text-white cursor-pointer list-none flex justify-between items-center">
              {f.q}
              <span className="text-[#adadb8] group-open:rotate-45 transition-transform text-lg leading-none">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-[#adadb8] leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
