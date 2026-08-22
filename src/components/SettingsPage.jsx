import { useAuth } from '../context/AuthContext'
import PageHeader from './PageHeader'

export default function SettingsPage({ onNavigate }) {
  const { user, logout, updateProfile, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <div className="p-6 text-sm text-zinc-400">Sign in to manage settings.</div>
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <PageHeader title="Settings" onBack={() => onNavigate?.('home')} />
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4">
        <div><p className="text-xs text-[#007ACC]">Email</p><p className="text-sm text-zinc-200 mt-1">{user?.email}</p></div>
        <label className="block text-xs text-[#007ACC]">Display name
          <input defaultValue={user?.displayName || ''} onBlur={(e) => updateProfile({ displayName: e.target.value.trim() || user.displayName })} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100" />
        </label>
        <label className="block text-xs text-[#007ACC]">Handle
          <input defaultValue={user?.handle || ''} onBlur={(e) => updateProfile({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) })} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100" />
        </label>
        <p className="text-xs text-zinc-500">Creator status: <span className="text-[#007ACC]">{user?.creatorStatus || 'none'}</span></p>
        <button type="button" onClick={() => { logout(); onNavigate?.('home') }} className="w-full h-10 rounded-lg border border-zinc-700 text-zinc-300 text-sm">Sign out</button>
      </div>
    </div>
  )
}
