import { useState } from 'react'
import {
  get2FA, enable2FA, disable2FA, listDevices, exportUserData,
  getWatchPrefs, setWatchPrefs, getNotifPrefs, setNotifPrefs,
} from '../lib/youtubeParity'
import { useAuth } from '../context/AuthContext'
import {
  isWatchHistoryEnabled,
  setWatchHistoryEnabled,
  getWatchHistory,
  clearWatchHistory,
} from '../lib/algorithmEngine'
import PageHeader from './PageHeader'

export default function SettingsPage({ onNavigate }) {
  const { user, logout, updateProfile, isAuthenticated } = useAuth()
  const [, force] = useState(0)

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-sm text-zinc-400">Sign in to manage settings.</div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <PageHeader title="Settings" onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <div>
          <p className="text-xs text-white">Email</p>
          <p className="text-sm text-zinc-200 mt-1">{user?.email}</p>
        </div>
        <label className="block text-xs text-white">
          Display name
          <input
            defaultValue={user?.displayName || ''}
            onBlur={(e) => updateProfile({ displayName: e.target.value.trim() || user.displayName })}
            className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-xs text-white">
          Handle (@username — unique, 3–24 chars)
          <input
            defaultValue={user?.handle || ''}
            onBlur={(e) => {
              try {
                updateProfile({ handle: e.target.value })
              } catch (err) {
                alert(err.message || 'Handle not available')
                e.target.value = user?.handle || ''
              }
            }}
            className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100"
            maxLength={24}
          />
        </label>
        <p className="text-xs text-zinc-500">
          Creator status: <span className="text-white">{user?.creatorStatus || 'none'}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            logout()
            onNavigate?.('home')
          }}
          className="w-full h-10 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:border-red-500/50"
        >
          Sign out
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-3">
        <p className="text-xs font-medium text-white">Watch history</p>
        <p className="text-[11px] text-zinc-500">
          Like YouTube: history improves Recommended. Turn off to stop saving new watches.
        </p>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={isWatchHistoryEnabled()}
            onChange={(e) => {
              setWatchHistoryEnabled(e.target.checked)
              force((n) => n + 1)
            }}
          />
          Save watch history on this device
        </label>
        <button
          type="button"
          className="h-9 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-300"
          onClick={() => {
            clearWatchHistory(user?.id)
            force((n) => n + 1)
          }}
        >
          Clear watch history
        </button>
        <ul className="max-h-40 overflow-y-auto space-y-1 text-[11px] text-zinc-500">
          {getWatchHistory(user?.id).slice(0, 30).map((h) => (
            <li key={h.id}>
              {h.title || h.contentId} · {h.type} · {h.at && new Date(h.at).toLocaleString()}
            </li>
          ))}
          {getWatchHistory(user?.id).length === 0 && <li>No history yet</li>}
        </ul>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-zinc-800 bg-[#121218] p-5">
        <p className="text-xs font-medium text-white">Security & playback</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="h-9 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-200" onClick={() => enable2FA(user?.id)}>Enable 2FA (local)</button>
          <button type="button" className="h-9 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-200" onClick={() => disable2FA(user?.id)}>Disable 2FA</button>
          <button type="button" className="h-9 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-200" onClick={() => {
            const blob = new Blob([JSON.stringify(exportUserData(user?.id), null, 2)], { type: 'application/json' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clips-data-export.json'; a.click()
          }}>Export my data</button>
        </div>
        <p className="text-[11px] text-zinc-500">2FA: {JSON.stringify(get2FA(user?.id))} · Devices: {listDevices(user?.id).length}</p>
        <div className="grid sm:grid-cols-2 gap-2 text-xs text-zinc-300">
          {Object.entries(getWatchPrefs()).map(([k, v]) => (
            <label key={k} className="flex items-center gap-2">
              {typeof v === 'boolean' ? (
                <input type="checkbox" checked={v} onChange={(e) => setWatchPrefs({ [k]: e.target.checked })} />
              ) : (
                <input className="w-16 h-8 rounded border border-zinc-800 bg-[#0b0b0f] px-1" value={v} onChange={(e) => setWatchPrefs({ [k]: e.target.value })} />
              )}
              {k}
            </label>
          ))}
        </div>
        <p className="text-xs text-white">Notification prefs</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(getNotifPrefs(user?.id)).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1 border border-zinc-800 rounded-lg px-2 py-1">
              <input type="checkbox" checked={!!v} onChange={(e) => { setNotifPrefs(user?.id, { [k]: e.target.checked }); force((n) => n + 1) }} />
              {{
                all: 'All',
                subscribers: 'New subscribers',
                likes: 'Likes',
                comments: 'Comments',
                mentions: 'Mentions',
                live: 'Live from subscriptions',
                posts: 'Community posts',
                uploads: 'New clips',
                premium: 'Premium purchases',
                application: 'Creator application',
                reports: 'Reports & tickets',
                marketing: 'Marketing',
              }[k] || k}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
