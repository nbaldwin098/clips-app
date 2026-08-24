import { useState } from 'react'
import { SETUP_SCRIPTS } from '../data/supabaseScripts'
import { ORG } from '../lib/orgConfig'
import {
  CLIPS_RESET_EMAIL_SUBJECT,
  CLIPS_RESET_EMAIL_BODY,
  CLIPS_CONFIRM_EMAIL_SUBJECT,
  CLIPS_CONFIRM_EMAIL_BODY,
  CLIPS_SMS_TEMPLATE,
} from '../lib/authBrand'

function CopyScript({ script }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script.sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <div className="rounded-xl border border-[#26262c] bg-[#121218] p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{script.title}</p>
          <p className="text-[11px] text-zinc-500">Step {script.id} · do not type this name into SQL</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold"
        >
          {copied ? 'Copied' : 'Copy SQL'}
        </button>
      </div>
    </div>
  )
}

export default function HelpPage() {
  const faqs = [
    {
      q: 'The SQL editor said trailing junk after 0005',
      a: 'You typed the file name. Postgres tried to read 0005 as a number. On this page, tap Copy SQL, paste the whole script into Supabase → SQL, then Run. Do that for 0005, 0006, 0007, 0008, and 0009.',
    },
    {
      q: 'How do I sign in?',
      a: 'Email and password, phone code, Apple, Microsoft, and X. CapCut cannot sign people in — it is an editor. Export from CapCut, then upload. 2FA is in Settings → Security after you sign in. NASA, NOAA, and the other library channels use @calabi.local emails on this site — they are not real nasa.gov logins.',
    },
    {
      q: 'Emails or texts say the wrong name',
      a: 'The site never prints that name. Mail and texts are sent by the auth dashboard. Open Authentication → Email Templates and Phone. Paste the Clips text from the copy buttons on this Help page. Use your own mail sender if you have one.',
    },
    {
      q: 'Why is the feed empty?',
      a: 'Clips does not show fabricated videos. Content appears after real imports or uploads from signed-in users.',
    },
    {
      q: 'How do I upload a video, clip, or go live?',
      a: 'Use the white + in the navbar. Choose Video or Clip to upload a file, add a sound and tags. Live is a lobby until ingest is connected — it does not start a video stream. Studio can import a public link.',
    },
    {
      q: 'Can I watch without an account?',
      a: 'Yes. Sign in is required to comment, post, upload, import, or go live.',
    },
    {
      q: 'The 467 people stopped when I closed the tab',
      a: 'The SQL editor is not on calabi.us. Tap Open SQL Editor on this Help page (supabase.com). Then Copy SQL for 0009 here, paste in that box, tap Run.',
    },
    {
      q: 'How does discovery work?',
      a: 'Recommended ranks like classic TikTok For You: watch completion and rewatches first, then shares, saves, comments, likes. Early skips bury a post. Follower count does not help. New posts get a short testing boost so a first upload can appear. Clips has Recommended and Following — no Shorts label.',
    },
    {
      q: 'What is a zero-storage import?',
      a: 'Paste a public short URL. We store only metadata and a reference — not the binary file.',
    },
    {
      q: 'How do subscriptions work?',
      a: 'Creators set a list price on Channel. Checkout shows that price. A Stripe Payment Link is what charges the card. Premium is marked only after Stripe sends you back. Payouts are not live — Wallet will not invent a balance.',
    },
    {
      q: 'How do I report copyright infringement?',
      a: 'Email a complete DMCA notice to copyright@calabi.us. See Settings → Copyright & DMCA.',
    },
    {
      q: 'Watch page keys?',
      a: 'k play/pause, j/l skip 10s, f fullscreen, m mute, c captions, n next, t theater, p picture-in-picture, 0–9 seek. Copy at time shares a resume link.',
    },
    {
      q: 'Drafts, schedule, stitch, captions?',
      a: 'Upload can save a draft, schedule a publish, add chapters, paste captions, and stitch a clip. Studio tools lists unpublished items. Captions are manual — there is no auto speech-to-text.',
    },
    {
      q: 'Can I pay for premium now?',
      a: 'Follow is free. The Stripe publishable key lives on Render as VITE_STRIPE_PUBLISHABLE_KEY. To charge cards, add a Payment Link as VITE_STRIPE_PAYMENT_LINK (same amount as the creator’s list price) and set its success URL to https://calabi.us/#/checkout?paid=1, then Manual Deploy.',
    },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-2">Help</h1>
      <p className="text-sm text-[#adadb8] mb-6">
        The SQL editor is on supabase.com — not on this site. Copy a script here, then paste it there. Never type the file name.
      </p>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold text-white">Where the SQL editor is</h2>
        <p className="text-sm text-zinc-400">
          1. Open this link (log in if it asks):{' '}
          <a
            className="text-white underline break-all"
            href={ORG.supabaseSqlEditor}
            target="_blank"
            rel="noreferrer"
          >
            Open SQL Editor
          </a>
        </p>
        <p className="text-sm text-zinc-400">
          2. You should see a big empty box. That box is the SQL editor.
        </p>
        <p className="text-sm text-zinc-400">
          3. Come back here, tap Copy SQL on “Named people activity job” (0009).
        </p>
        <p className="text-sm text-zinc-400">
          4. Click in the empty box, paste (Ctrl+V or Cmd+V), then tap the green Run button (bottom right).
        </p>
        <p className="text-xs text-zinc-500">
          If it asks you to log in, use the same email you used when you made the Clips database. If the last lines of 0009 fail, click Database on the left, then Extensions, turn on pg_cron, and run 0009 again.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold text-white">Copy these scripts</h2>
        <p className="text-xs text-zinc-500">
          0009 is the one that makes the 467 people keep watching and liking — each person picks random videos, clips, pics, or live. If you already ran 0009 once, copy and run it again so the random job replaces the old one.
        </p>
        {SETUP_SCRIPTS.map((script) => (
          <CopyScript key={script.id} script={script} />
        ))}
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold text-white">Make mail and texts say Clips</h2>
        <p className="text-xs text-zinc-500">
          Authentication → Providers: turn on Email, Phone, Apple, Azure (Microsoft), Twitter (X). Phone needs a text sender (Twilio). Then Email Templates and the SMS box: paste these.
        </p>
        {[
          { title: 'Reset email subject', text: CLIPS_RESET_EMAIL_SUBJECT },
          { title: 'Reset email body', text: CLIPS_RESET_EMAIL_BODY },
          { title: 'Confirm email subject', text: CLIPS_CONFIRM_EMAIL_SUBJECT },
          { title: 'Confirm email body', text: CLIPS_CONFIRM_EMAIL_BODY },
          { title: 'Text message', text: CLIPS_SMS_TEMPLATE },
        ].map((row) => (
          <CopyScript key={row.title} script={{ id: row.title, title: row.title, sql: row.text }} />
        ))}
      </section>

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
