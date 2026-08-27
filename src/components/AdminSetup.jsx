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

function CopyBlock({ title, text, preview = false }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <div className="rounded-xl border border-[#26262c] bg-[#121218] p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <button
          type="button"
          onClick={copy}
          className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {preview ? (
        <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{text}</pre>
      ) : null}
    </div>
  )
}

export default function AdminSetup() {
  return (
    <div className="space-y-6 max-w-3xl">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Database scripts</h2>
        <p className="text-sm text-zinc-400">
          Run these in the Supabase SQL editor, not on calabi.us. Open{' '}
          <a
            className="text-white underline break-all"
            href={ORG.supabaseSqlEditor}
            target="_blank"
            rel="noreferrer"
          >
            Open SQL Editor
          </a>
          , paste one script, then Run. Do not type the file name into the box.
          Same scripts live under <code className="text-zinc-300">supabase/migrations/</code>
          — Admin Setup is the copy-paste path; SQL Editor is fine for greenfield
          (see <code className="text-zinc-300">docs/DEPLOY_CHECKLIST.md</code>).
        </p>
        <p className="text-xs text-amber-400/90">
          Start with <strong className="text-amber-300">0001 → 0004</strong> if you have never set up this project.
          Error <code className="text-amber-200">42P01 … profiles does not exist</code> means 0004 was skipped — run 0004, then re-run the script that failed (e.g. 0019 News).
          Latest listed: <strong className="text-amber-300">0022</strong> (DMs).
        </p>
        <p className="text-xs text-zinc-500">
          After 0004, promote yourself once (replace the UUID with Authentication → Users → your id):
          {' '}
          <code className="text-zinc-400">update public.profiles set role = &apos;admin&apos;, creator_status = &apos;approved&apos; where id = &apos;YOUR-UUID&apos;;</code>
        </p>
        <p className="text-xs text-zinc-500">
          0010 turns off the named-account like/watch job. The 467 people accounts still exist for sign-in. Run 0010 in the SQL editor if 0009 already scheduled that job.
        </p>
        {SETUP_SCRIPTS.map((script) => (
          <CopyBlock key={script.id} title={`${script.title} (${script.id})`} text={script.sql} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Render (Node)</h2>
        <p className="text-sm text-zinc-400">
          Production is a <strong className="text-zinc-200">Node web service</strong> running Next.js
          (<code className="text-zinc-300">npm run build</code> + <code className="text-zinc-300">npm run start</code>),
          not a Static Site. SPA path rewrites to <code className="text-zinc-300">index.html</code> are not used.
          Env checklist: <code className="text-zinc-300">docs/RENDER_ENV.md</code>. Health: <code className="text-zinc-300">/api/health</code>.
        </p>
        <CopyBlock
          title="Render start (Node)"
          preview
          text={'Build: npm install && npm run build\nStart: npm run start\nBlueprint: render.yaml'}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">CS macros & chargebacks</h2>
        <p className="text-sm text-zinc-400">
          Coins/Orders reply templates and chargeback wording live in{' '}
          <code className="text-zinc-300">docs/SUPPORT_MACROS.md</code>. Escrow timers:{' '}
          <code className="text-zinc-300">docs/ESCROW_TIMEOUT_POLICY.md</code>. Stripe incidents:{' '}
          <code className="text-zinc-300">docs/RUNBOOK_STRIPE_WEBHOOK.md</code>.
        </p>
        <CopyBlock
          title="Coins missing after pay (short)"
          preview
          text={'Thanks — Coins credit when Checkout returns to calabi. Reply with account email, approx time/amount, and Stripe receipt if you have it. We will match the Payment and credit the ledger if the return page was closed early.'}
        />
        <CopyBlock
          title="Chargeback hold (short)"
          preview
          text={'We received a card dispute. Related Coins may be reversed and creator payouts held until Stripe closes the case. If accidental, withdraw the dispute with your bank and tell us.'}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Mail and text templates</h2>
        <p className="text-xs text-zinc-500">
          Authentication → Providers, then Email Templates and the SMS box.
        </p>
        {[
          { title: 'Reset email subject', text: CLIPS_RESET_EMAIL_SUBJECT },
          { title: 'Reset email body', text: CLIPS_RESET_EMAIL_BODY },
          { title: 'Confirm email subject', text: CLIPS_CONFIRM_EMAIL_SUBJECT },
          { title: 'Confirm email body', text: CLIPS_CONFIRM_EMAIL_BODY },
          { title: 'Text message', text: CLIPS_SMS_TEMPLATE },
        ].map((row) => (
          <CopyBlock key={row.title} title={row.title} text={row.text} />
        ))}
      </section>
    </div>
  )
}
