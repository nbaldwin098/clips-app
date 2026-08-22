import { useState } from 'react'
import { Shield, Mail, AlertTriangle, FileText, Scale } from 'lucide-react'

export default function CopyrightSettings() {
  const [strikes] = useState([]) // real strikes only; empty until notices received

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Copyright & DMCA</h1>
        <p className="mt-1 text-sm text-slate-500">
          Notice-and-takedown only. No proactive or automated Content ID scanning.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Mail className="h-4 w-4" /> Designated intake
        </h2>
        <p className="text-sm text-slate-600">
          All copyright claims must be submitted by email to the designated agent.
        </p>
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 font-mono text-sm text-slate-800">
          copyright@platform.internal
        </div>
        <p className="text-xs text-slate-500">
          Counter-notifications: dmca-counter@platform.internal
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4" /> Required elements of a valid notice
        </h2>
        <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
          <li>Physical or electronic signature of the copyright owner or authorized agent.</li>
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>Specific identification of the infringing material (direct video URL and precise timestamp).</li>
          <li>Complainant contact details (full legal name, physical address, email, telephone).</li>
          <li>A statement of good faith belief that use of the material is unauthorized.</li>
          <li>A statement under penalty of perjury that the information provided is accurate.</li>
        </ul>
      </section>

      <section className="space-y-3 pt-6 border-t border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Shield className="h-4 w-4" /> Platform action
        </h2>
        <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
          <li>Upon verifying a complete notice, targeted content is removed or access is disabled within 24 hours.</li>
          <li>The affected creator receives an immediate dashboard alert and email with a copy of the notice, the reason for removal, and instructions to resolve the strike.</li>
          <li>A formal copyright strike is recorded against the creator account.</li>
        </ul>
      </section>

      <section className="space-y-3 pt-6 border-t border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Three-strike policy
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">First strike</p>
            <p className="mt-2 text-sm text-slate-700">Content removal and official warning notice.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Second strike</p>
            <p className="mt-2 text-sm text-slate-700">Temporary restriction on live-streaming or long-form uploads for 7 days.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Third strike</p>
            <p className="mt-2 text-sm text-slate-700">Permanent account termination and forfeiture of creator wallet payouts tied to infringing activity.</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Strikes automatically clear after 90 days of clean account standing, provided no additional notices are received.
        </p>
      </section>

      <section className="space-y-3 pt-6 border-t border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Scale className="h-4 w-4" /> Counter-notification (DMCA 512(g))
        </h2>
        <p className="text-sm text-slate-600">
          If you believe material was removed by mistake, misidentification, or fair use, submit a formal counter-notification to dmca-counter@platform.internal containing:
        </p>
        <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
          <li>Identification of the removed material and its prior location URL.</li>
          <li>Statement under penalty of perjury that the material was removed by mistake or misidentification.</li>
          <li>Consent to local Federal District Court jurisdiction (or the platform&apos;s jurisdiction if international) and agreement to accept service of process from the claimant.</li>
          <li>Full legal name, physical address, phone number, and electronic signature.</li>
        </ul>
        <p className="text-sm text-slate-600">
          After a valid counter-notification is forwarded to the original claimant, the claimant has 10–14 business days to provide notice of a filed court action. If no such notice is received, the platform restores the content and removes the strike.
        </p>
      </section>

      <section className="pt-6 border-t border-slate-200 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Your active strikes</h2>
        {strikes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
            No copyright strikes on this account.
          </div>
        ) : (
          <ul className="space-y-2">
            {strikes.map((s, i) => (
              <li key={i} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                Strike {i + 1}: {s.reason} — {s.date}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
