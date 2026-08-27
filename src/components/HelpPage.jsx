import { ORG } from '../lib/orgConfig'

export default function HelpPage() {
  const faqs = [
    {
      q: 'How do I sign in?',
      a: 'Use email and password, a phone code, Apple, Microsoft, or X. CapCut cannot sign people in — export the file, then upload it here.',
    },
    {
      q: 'How do I upload or go live?',
      a: 'Open Create in the left sidebar (under Live). On mobile, open the sidebar from the header controls — there is no hamburger menu. Upload a video, clip, or pic, or go live from Create. Live opens a lobby until ingest is connected — it does not start a video stream by itself.',
    },
    {
      q: 'Can I donate on live or on a video?',
      a: 'Yes when own Stripe Checkout is deployed. Pick $2, $5, $10, $25, or enter a custom amount ($1–$500). Nothing is marked until Stripe sends you back. Live donations appear in that chat.',
    },
    {
      q: 'How do I stream from a PC, Xbox, or PS5?',
      a: 'OBS Studio is free. Studio → Stream has setup steps. On Live, use Connect OBS window and pick your OBS preview (or OBS Virtual Camera). Xbox/PS5 need an HDMI capture card into a PC running OBS. Site-wide lobby listing still needs RTMP ingest configured.',
    },
    {
      q: 'Where is Studio, Wallet, and analytics?',
      a: 'Open your profile picture → Creator dashboard (Analytics, Earnings, VODs, Stream, Verify). Under Site settings: Account and Coins (Orders tab for purchase history). Create (upload / go live) is in the left sidebar — not a header hamburger.',
    },
    {
      q: 'Coins packs say Cash — what am I buying?',
      a: 'The shop sells Coin packs only (Cash→Coins catalog). Profile → Coins shows packs; Orders lists purchases and spends. Stripe Checkout must return to the site for credit to apply.',
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
      a: 'NASA and other library channels already have an official checkmark. Everyone else uploads photos of the front and back of a government ID from Creator dashboard → Get verified. Admin accepts or denies it.',
    },
    {
      q: 'How do creator payouts work?',
      a: 'Anyone signed in can upload or go live from Create. To earn, apply from Creator dashboard → Earnings or the apply page. Admin sends payouts after approval. Withdrawals are requested from Earnings. Views are not worth $1 per 1,000.',
    },
    {
      q: 'How long is escrow held?',
      a: 'Live request tips stay held until the creator fulfills and Admin releases. Target: refund donors if still held after 14 days. Marketplace: funds release ~7 days after delivery with a 7-day buyer dispute window. Details: docs/ESCROW_TIMEOUT_POLICY.md for operators.',
    },
    {
      q: 'What happens on a chargeback?',
      a: 'If your bank disputes a Coins or shop payment, we may reverse Coins and hold related creator payouts until Stripe closes the case. Contact support with the receipt id — see chargeback macros for CS in docs/SUPPORT_MACROS.md.',
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
      a: `Email ${ORG.supportEmail}. For Coins/Orders issues, include your account email, approximate time, and Stripe receipt if you have one.`,
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
