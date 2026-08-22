export default function HelpPage() {
  const faqs = [
    {
      q: 'Why is the feed empty?',
      a: 'Clips never shows fabricated creators or videos. Content appears only after real uploads or imports.',
    },
    {
      q: 'How does discovery work?',
      a: 'A learning machine ranks by completion, rewatches, shares, and skips. Weights adapt to each viewer. Follower count is ignored.',
    },
    {
      q: 'What is a zero-storage import?',
      a: 'Paste a public short URL. We store only metadata and a reference — not the binary file.',
    },
    {
      q: 'How do subscriptions work?',
      a: 'Creators set the price and receive 100% of it. Processing fees are charged on top to the buyer.',
    },
    {
      q: 'How do I report copyright infringement?',
      a: 'Email a complete DMCA notice to copyright@platform.internal. See Settings → Copyright & DMCA.',
    },
  ]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Help</h1>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="rounded-xl border border-slate-200 bg-white px-4 py-3 group">
            <summary className="text-sm font-medium text-slate-900 cursor-pointer list-none flex justify-between items-center">
              {f.q}
              <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
            </summary>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
