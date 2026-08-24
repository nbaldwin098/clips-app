import { ORG } from '../../lib/orgConfig'
import { Shield, Mail, AlertTriangle, FileText, Scale } from 'lucide-react'

export default function CopyrightSettings() {
  return (
    <div className="space-y-8 text-zinc-200">
      <div>
        <h1 className="text-xl font-semibold text-white">Copyright & DMCA</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Notice-and-takedown only. No automated Content ID scanner.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Mail className="h-4 w-4" /> Designated intake
        </h2>
        <p className="text-sm text-zinc-400">Send a complete DMCA notice to:</p>
        <div className="rounded-lg bg-[#0b0b0f] border border-zinc-800 px-4 py-3 font-mono text-sm text-white">
          {ORG.copyrightEmail}
        </div>
        <p className="text-xs text-zinc-500">Counter-notifications: {ORG.dmcaEmail}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="h-4 w-4" /> Required elements of a valid notice
        </h2>
        <ul className="text-sm text-zinc-400 space-y-2 list-disc pl-5">
          <li>Physical or electronic signature of the copyright owner or authorized agent.</li>
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>Specific identification of the infringing material (direct video URL and precise timestamp).</li>
          <li>Complainant contact details (full legal name, physical address, email, telephone).</li>
          <li>A statement of good faith belief that use of the material is unauthorized.</li>
          <li>A statement under penalty of perjury that the information provided is accurate.</li>
        </ul>
      </section>

      <section className="space-y-3 pt-6 border-t border-zinc-800">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="h-4 w-4" /> Platform action
        </h2>
        <ul className="text-sm text-zinc-400 space-y-2 list-disc pl-5">
          <li>Upon verifying a complete notice, targeted content is removed or access is disabled.</li>
          <li>The affected creator is notified with a copy of the notice when we have a working inbox on file.</li>
          <li>A copyright strike may be recorded against the account.</li>
        </ul>
      </section>

      <section className="space-y-3 pt-6 border-t border-zinc-800">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Three-strike policy
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">First strike</p>
            <p className="mt-2 text-sm text-zinc-300">Content removal and warning.</p>
          </div>
          <div className="rounded-lg border border-zinc-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Second strike</p>
            <p className="mt-2 text-sm text-zinc-300">Temporary restriction on live or long-form uploads for 7 days.</p>
          </div>
          <div className="rounded-lg border border-zinc-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Third strike</p>
            <p className="mt-2 text-sm text-zinc-300">Account may be terminated.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 pt-6 border-t border-zinc-800">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Scale className="h-4 w-4" /> Counter-notification
        </h2>
        <p className="text-sm text-zinc-400">
          If you believe material was removed by mistake, send a counter-notification to {ORG.dmcaEmail}.
        </p>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Your active strikes</h2>
        <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          No copyright strikes on this account.
        </div>
      </section>
    </div>
  )
}
