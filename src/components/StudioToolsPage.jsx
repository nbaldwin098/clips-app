import PageHeader from './PageHeader'

export default function StudioToolsPage({ onNavigate }) {
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <PageHeader title="Studio tools" onBack={() => onNavigate?.('dashboard')} />
      <div className="rounded-xl border border-[#2f2f37] bg-[#1f1f23] p-5 space-y-2 text-sm text-zinc-300">
        <p>Drafts, schedule, chapters, and earn settings live here.</p>
        <button type="button" onClick={() => onNavigate?.('analytics')} className="text-white">Analytics →</button>
        <br />
        <button type="button" onClick={() => onNavigate?.('stream-settings')} className="text-white">Stream settings →</button>
      </div>
    </div>
  )
}
