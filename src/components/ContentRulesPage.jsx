import { ORG, CONTENT_RULES_SHORT } from '../lib/orgConfig'

export default function ContentRulesPage() {
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold text-white">Content rules</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-4">
        How we keep {ORG.productName} clean while we grow. Full legal text is under More → Terms / Guidelines.
      </p>
      <ul className="space-y-3 rounded-2xl border border-zinc-800 bg-[#121218] p-5">
        {CONTENT_RULES_SHORT.map((rule) => (
          <li key={rule} className="text-sm text-zinc-300 flex gap-2">
            <span className="text-zinc-600 shrink-0">•</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500 mt-4">
        Copyright: <a className="text-white underline" href={`mailto:${ORG.copyrightEmail}`}>{ORG.copyrightEmail}</a>
        <br />
        Support: <a className="text-white underline" href={`mailto:${ORG.supportEmail}`}>{ORG.supportEmail}</a>
      </p>
    </div>
  )
}
