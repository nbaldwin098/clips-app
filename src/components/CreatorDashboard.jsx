import { useState } from 'react'
import { Upload, Radio, Link2, BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet } from '../lib/storage'
import { getCreatorContent } from '../lib/contentService'
import { getViews } from '../lib/engagement'
import { copyShareUrl } from '../lib/routes'
import PageHeader from './PageHeader'

export default function CreatorDashboard({ onOpenImport, onOpenUpload, onNavigate }) {
  const { user } = useAuth()
  const clips = getCreatorContent(user?.id, user?.handle)
  const live = lsGet(`live_state_${user?.id}`, null)
  const views = clips.reduce((n, c) => n + (getViews(c.id) || c.views || 0), 0)
  const [copied, setCopied] = useState(false)
  const approved = user?.creatorStatus === 'approved'

  const copyChannel = async () => {
    if (!user?.handle) return
    await copyShareUrl('profile', user.handle)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 md:p-6 max-w-[1000px] mx-auto">
      <PageHeader title="Studio" subtitle="Manage clips, live, and channel" onBack={() => onNavigate('home')} />
      {!approved ? (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm text-zinc-300">
          Apply before studio tools stay unlocked.{' '}
          <button type="button" className="text-white underline" onClick={() => onNavigate('creator-apply')}>Open creator apply</button>
        </div>
      ) : null}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <button type="button" onClick={onOpenUpload} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-left hover:border-white"><Upload className="h-5 w-5 text-white" /><p className="mt-2 text-sm text-zinc-100">Upload / create</p></button>
        <button type="button" onClick={onOpenImport} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-left hover:border-white"><Link2 className="h-5 w-5 text-white" /><p className="mt-2 text-sm text-zinc-100">Import link</p></button>
        <button type="button" onClick={() => onNavigate('live')} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-left hover:border-white"><Radio className="h-5 w-5 text-white" /><p className="mt-2 text-sm text-zinc-100">Go live</p><p className="text-xs text-zinc-500">{live?.isLive ? 'Live now' : 'Lobby only — no ingest'}</p></button>
        <button type="button" onClick={() => onNavigate('studio-tools')} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-left hover:border-white"><BarChart3 className="h-5 w-5 text-white" /><p className="mt-2 text-sm text-zinc-100">Studio tools</p><p className="text-xs text-zinc-500">Drafts and schedule</p></button>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 mb-4">
        <div className="flex items-center gap-2 mb-2"><BarChart3 className="h-4 w-4 text-white" /><h2 className="text-sm text-zinc-100">Overview</h2></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <div><p className="text-lg text-white font-semibold">{clips.length}</p><p className="text-[10px] text-zinc-500">Posts</p></div>
          <div><p className="text-lg text-white font-semibold">{views}</p><p className="text-[10px] text-zinc-500">Views on this device</p></div>
          <div><p className="text-lg text-white font-semibold">{live?.isLive ? 'Live' : 'Off'}</p><p className="text-[10px] text-zinc-500">Broadcast</p></div>
        </div>
        <button type="button" onClick={copyChannel} className="mt-4 h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold">
          {copied ? 'Copied profile link' : 'Copy profile link'}
        </button>
      </div>
      <h2 className="text-sm font-medium text-white mb-2">Your posts</h2>
      {clips.length === 0 ? <p className="text-xs text-zinc-500">No posts yet.</p> : clips.map((c) => <div key={c.id} className="rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2 text-sm text-zinc-300 mb-1">{c.title}</div>)}
      <p className="mt-6 text-xs text-zinc-500">Wallet does not invent a balance. Payouts wait on Stripe Connect.</p>
      <button type="button" onClick={() => onNavigate('wallet')} className="mt-2 text-sm text-white">Open wallet →</button>
    </div>
  )
}
