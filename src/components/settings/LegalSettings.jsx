import { ORG } from '../../lib/orgConfig'

export default function LegalSettings({ onNavigate }) {
  return (
    <div className="space-y-8 text-zinc-200">
      <div>
        <h1 className="text-xl font-semibold text-white">Legal & Data</h1>
        <p className="mt-1 text-sm text-zinc-500">Public policies and how to reach Clips.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onNavigate?.('legal-tos')} className="h-9 px-3 rounded-lg border border-zinc-700 text-sm text-zinc-200">Terms</button>
        <button type="button" onClick={() => onNavigate?.('legal-privacy')} className="h-9 px-3 rounded-lg border border-zinc-700 text-sm text-zinc-200">Privacy</button>
        <button type="button" onClick={() => onNavigate?.('legal-creator')} className="h-9 px-3 rounded-lg border border-zinc-700 text-sm text-zinc-200">Creator agreement</button>
        <button type="button" onClick={() => onNavigate?.('legal-community')} className="h-9 px-3 rounded-lg border border-zinc-700 text-sm text-zinc-200">Guidelines</button>
      </div>
      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm space-y-1">
        <p>Support: {ORG.supportEmail}</p>
        <p>Copyright: {ORG.copyrightEmail}</p>
        <p>Privacy: {ORG.privacyEmail}</p>
        <p>Legal: {ORG.legalEmail}</p>
      </section>
      <p className="text-xs text-zinc-500">
        Export and clear this device from Settings → Security. Email is stored with your Clips account when you signed in with email.
      </p>
    </div>
  )
}
