import { ORG } from '../lib/orgConfig'

export default function HelpPage() {
  const faqs = [
    {
      q: 'How do I sign in?',
      a: 'Use email and password, a phone code, Apple, Microsoft, or X. CapCut cannot sign people in — export the file, then upload it here.',
    },
    {
      q: 'How do I upload or go live?',
      a: 'Open the left menu (hamburger) and tap Create, under Live. Upload a video, clip, or pic, or go live from there. Live opens a lobby until ingest is connected — it does not start a video stream by itself.',
    },
    {
      q: 'Can I donate on live or on a video?',
      a: 'Yes if this deploy has a Stripe Payment Link. Pick $2, $5, $10, or $25. Nothing is marked until Stripe sends you back. Live donations appear in that chat. Post donations can show on your comments unless you turn that off in Settings → Comments.',
    },
    {
      q: 'How do I stream from a PC, Xbox, or PS5?',
      a: 'Xbox and PS5 cannot send a picture here. They only talk to their own apps, or you run HDMI into a capture card on a PC and use OBS later. On a PC, Live → Share this screen is a preview on that browser only. Other viewers still see the lobby until ingest is connected. Mods, bots, and !rules live under Settings → Roles.',
    },
    {
      q: 'Where is Studio, Wallet, and analytics?',
      a: 'Open your profile picture in the top right. Creator Dashboard, analytics, wallet, VODs, and settings are in that menu. Create (upload and go live) is in the left menu, under Live.',
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
      a: 'NASA and other library channels already have an official checkmark. Everyone else uploads photos of the front and back of a government ID from the profile menu → Get verified. Admin accepts or denies it.',
    },
    {
      q: 'How do creator payouts work?',
      a: 'Admin sets USD per 1,000 views. Wallet (profile menu) shows earned, pending, and paid. Payouts are sent by hand. There is no automatic bank withdraw.',
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
      a: `Email ${ORG.supportEmail}.`,
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
