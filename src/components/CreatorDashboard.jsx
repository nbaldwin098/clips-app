import { useState } from 'react'
import { Upload, Radio, Link2, BarChart3, Wallet, Settings, Video, Key, Copy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { lsGet } from '../lib/storage'
import { getCreatorContent } from '../lib/contentService'
import { getViews } from '../lib/engagement'
import { copyShareUrl } from '../lib/routes'
import { creatorBalance } from '../lib/payouts'
import { ensureStreamKey } from '../lib/streamKeys'
import { listVods } from '../lib/vods'
import PageHeader from './PageHeader'

export default function CreatorDashboard({ onOpenImport, onOpenUpload, onNavigate }) {
  const { user } = useAuth()
  const clips = getCreatorContent(user?.id, user?.handle)
  const live = lsGet(`live_state_${user?.id}`, null)
  const views = clips.reduce((n, c) => n + (getViews(c.id) || c.views || 0), 0)
  const [copied, setCopied] = useState('')
  const approved = Boolean(user?.id)
  const b = creatorBalance(user?.id, user?.handle)
  const key = user?.id ? ensureStreamKey(user.id) : ''
  const vods = listVods(user?.id)

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  const copyChannel = async () => {
    if (!user?.handle) return
    await copyShareUrl('profile', user.handle)
    setCopied('profile')
    setTimeout(() => setCopied(''), 2000)
  }

  const tile = (Icon, label, sub, onClick) => (
    <button type="button" onClick={onClick} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-left hover:border-white">
      <Icon className="h-5 w-5 text-white" />
      <p className="mt-2 text-sm text-zinc-100">{label}</p>
      {sub ? <p className="text-xs text-zinc-500">{sub}</p> : null}
    </button>
  )

  return (
    <div className="p-4 md:p-6 max-w-[1000px] mx-auto">
      <PageHeader title="Creator Dashboard" subtitle="Stream, content, analytics, wallet" onBack={() => onNavigate('home')} />
      {!approved ? (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm text-zinc-300">
          Sign in to upload and use Studio.
        </div>
      ) : null}
      <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {tile(Upload, 'Upload', 'Video, clip, pic', onOpenUpload)}
        {tile(Link2, 'Import', 'Public link', onOpenImport)}
        {tile(Radio, 'Go live', live?.isLive ? 'Lobby live' : 'Lobby — ingest later', () => onNavigate('live'))}
        {tile(Video, 'VODs', `${vods.length} copies`, () => onNavigate('vods'))}
        {tile(BarChart3, 'Analytics', `${views} views`, () => onNavigate('analytics'))}
        {tile(Wallet, 'Wallet', `$${b.pending.toFixed(2)} pending`, () => onNavigate('wallet'))}
        {tile(Settings, 'Channel', 'Profile & links', () => onNavigate('channel'))}
        {tile(Key, 'Stream', 'Key & VOD channel', () => onNavigate('settings', 'stream'))}
      </div>
      <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 mb-4">
        <p className="text-sm text-zinc-100 mb-3">Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div><p className="text-lg text-white font-semibold">{clips.length}</p><p className="text-[10px] text-zinc-500">Posts</p></div>
          <div><p className="text-lg text-white font-semibold">{views}</p><p className="text-[10px] text-zinc-500">Views</p></div>
          <div><p className="text-lg text-white font-semibold">${b.earned.toFixed(2)}</p><p className="text-[10px] text-zinc-500">Earned</p></div>
          <div><p className="text-lg text-white font-semibold">{live?.isLive ? 'Live' : 'Off'}</p><p className="text-[10px] text-zinc-500">Lobby</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={copyChannel} className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold">
            {copied === 'profile' ? 'Copied' : 'Copy profile link'}
          </button>
          <button type="button" onClick={() => copy(key, 'key')} className="h-9 px-3 rounded-lg border border-zinc-700 text-white text-xs inline-flex items-center gap-1">
            <Copy className="h-3 w-3" /> {copied === 'key' ? 'Copied key' : 'Copy stream key'}
          </button>
        </div>
        <p className="mt-3 text-[11px] text-zinc-500 break-all">Stream key {key}. Live ingest is not connected — keep the key for when OBS can connect.</p>
      </div>
      <h2 className="text-sm font-medium text-white mb-2">Your posts</h2>
      {clips.length === 0 ? <p className="text-xs text-zinc-500">No posts yet.</p> : clips.map((c) => <div key={c.id} className="rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2 text-sm text-zinc-300 mb-1">{c.title}</div>)}
    </div>
  )
}
