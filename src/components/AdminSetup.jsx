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
        </p>
        <p className="text-xs text-zinc-500">
          0010 turns off the named-account like/watch job. The 467 people accounts still exist for sign-in. Run 0010 in the SQL editor if 0009 already scheduled that job.
        </p>
        <p className="text-xs text-zinc-500">
          0011 adds Direct Messages. Only real email/phone accounts (not the demo owner/named logins) can message each other — the browser encrypts every message before it leaves the device, so this table never holds plaintext. Also flip Realtime on for the `direct_messages` table in Database → Replication if the migration's publication step did not take.
        </p>
        {SETUP_SCRIPTS.map((script) => (
          <CopyBlock key={script.id} title={`${script.title} (${script.id})`} text={script.sql} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Site paths</h2>
        <p className="text-sm text-zinc-400">
          calabi.us is a single-page app. Render must rewrite every missing path to index.html, or /clips, /watch/…, and /about return Not Found. In the static site: Redirects/Rewrites → add this rewrite (or apply the repo Blueprint).
        </p>
        <CopyBlock
          title="Render rewrite"
          preview
          text={'Source: /*\nDestination: /index.html\nAction: Rewrite'}
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
