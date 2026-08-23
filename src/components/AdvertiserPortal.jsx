import { useState, useEffect } from 'react'
import {
  Building2,
  Key,
  LogOut,
  Plus,
  AlertCircle,
} from 'lucide-react'
import {
  advertiserLogin,
  getAdvertiserSession,
  advertiserLogout,
  changeAdvertiserPassword,
  getAdvertiserCampaigns,
  saveAdvertiserCampaign,
} from '../lib/adEngine'
import PageHeader from './PageHeader'

const inputCls =
  'mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white focus:outline-none'

export default function AdvertiserPortal({ onNavigate }) {
  const [session, setSession] = useState(() => getAdvertiserSession())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState('')

  // Campaigns state
  const [campaigns, setCampaigns] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [headline, setHeadline] = useState('')
  const [ctaText, setCtaText] = useState('Learn More')
  const [targetUrl, setTargetUrl] = useState('')
  const [durationSec, setDurationSec] = useState(15)

  useEffect(() => {
    if (session?.advertiserId) {
      setCampaigns(getAdvertiserCampaigns(session.advertiserId))
    }
  }, [session?.advertiserId])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    const res = await advertiserLogin(username, password)
    if (res.ok) {
      setSession(res.session)
      setPassword('')
    } else {
      setLoginError(res.error || 'Login failed')
    }
  }

  const handleLogout = () => {
    advertiserLogout()
    setSession(null)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwMessage('')
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match')
      return
    }
    const res = await changeAdvertiserPassword(session.advertiserId, newPassword)
    if (res.ok) {
      setPwMessage('Password updated successfully!')
      setSession((s) => ({ ...s, mustChangePassword: false }))
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setPwError(res.error || 'Failed to change password')
    }
  }

  const handleSaveCampaign = (e) => {
    e.preventDefault()
    if (!session?.advertiserId) return
    try {
      saveAdvertiserCampaign({
        advertiserId: session.advertiserId,
        businessName: session.businessName,
        headline: headline.trim() || 'Sponsored Video Ad',
        ctaText: ctaText.trim() || 'Learn More',
        targetUrl: targetUrl.trim(),
        durationSec: Number(durationSec) || 15,
        skipAfterSec: 5,
        status: 'active',
      })
      setCampaigns(getAdvertiserCampaigns(session.advertiserId))
      setCreateOpen(false)
      setHeadline('')
      setTargetUrl('')
    } catch (err) {
      setPwError(err?.message || 'Could not save campaign.')
    }
  }

  if (!session) {
    return (
      <div className="p-4 md:p-6 max-w-md mx-auto space-y-6">
        <PageHeader title="Advertiser Portal" onBack={() => onNavigate?.('advertise')} />
        <div className="rounded-3xl border border-zinc-800 bg-[#121218] p-6 space-y-5">
          <div className="text-center space-y-1">
            <div className="h-12 w-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white">Sign In to Advertiser Portal</h2>
            <p className="text-xs text-zinc-400">
              Approved businesses can manage ads, edit campaigns, and view telemetry.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-xs font-semibold text-zinc-300">
              Portal Username
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="partner username"
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-300">
              Password
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </label>

            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all"
            >
              Log In to Portal
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800/80 text-center">
            <p className="text-[11px] text-zinc-500">
              Not an approved advertiser yet?{' '}
              <button
                type="button"
                onClick={() => onNavigate?.('advertise')}
                className="text-white font-semibold underline underline-offset-2"
              >
                Apply here
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-white" />
            <h1 className="text-xl font-bold text-white">{session.businessName}</h1>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
              Approved Partner
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">@{session.username} · Advertiser Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-zinc-800 bg-[#14141c] text-xs text-zinc-300 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Change Password Prompt / Section */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-white" /> Change Portal Password
          </h2>
          {session.mustChangePassword && (
            <span className="text-[11px] text-amber-400 font-medium">Please update your temporary password</span>
          )}
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            required
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (6+ chars)"
            className={inputCls}
          />
          <input
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className={inputCls}
          />
          <button
            type="submit"
            className="h-10 mt-1 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200"
          >
            Update Password
          </button>
        </form>
        {pwMessage && <p className="text-xs text-emerald-400">{pwMessage}</p>}
        {pwError && <p className="text-xs text-red-400">{pwError}</p>}
      </div>

      {/* Campaigns & Placement Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Your Video & Preroll Advertisements</h2>
            <p className="text-xs text-zinc-500">Configured 5-second skippable video ads displayed across Clips.</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" /> New Ad Campaign
          </button>
        </div>

        {createOpen && (
          <form onSubmit={handleSaveCampaign} className="rounded-2xl border border-zinc-800 bg-[#15151e] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Create New Video Ad</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-xs font-semibold text-zinc-300">
                Headline / Overlay Copy *
                <input
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Try our premium creator studio tools"
                  className={inputCls}
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-300">
                Call To Action Text
                <input
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Learn More"
                  className={inputCls}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-xs font-semibold text-zinc-300">
                Landing Page Destination URL *
                <input
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://yourcompany.com/offer"
                  className={inputCls}
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-300">
                Preroll Max Duration (Seconds)
                <select
                  value={durationSec}
                  onChange={(e) => setDurationSec(Number(e.target.value))}
                  className={inputCls}
                >
                  <option value={15}>15 seconds (Skip after 5s)</option>
                  <option value={20}>20 seconds (Skip after 5s)</option>
                  <option value={30}>30 seconds (Skip after 5s)</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 px-4 rounded-lg border border-zinc-800 text-xs text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-white text-black text-xs font-bold"
              >
                Launch Ad Placement
              </button>
            </div>
          </form>
        )}

        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-8 text-center text-sm text-zinc-500">
            No active campaigns configured. Click "+ New Ad Campaign" to set up your first placement.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 space-y-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    {c.status || 'Active'}
                  </span>
                  <span className="text-xs text-zinc-500">Skip after 5s</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{c.headline}</h4>
                  <p className="text-xs text-zinc-400 mt-1 truncate">{c.targetUrl}</p>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-center">
                  <div className="p-2 rounded-xl bg-[#0e0e14]">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Impressions</span>
                    <p className="text-sm font-bold text-white mt-0.5">{c.impressions || 0}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0e0e14]">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Clicks</span>
                    <p className="text-sm font-bold text-white mt-0.5">{c.clicks || 0}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0e0e14]">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Skips</span>
                    <p className="text-sm font-bold text-white mt-0.5">{c.skips || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
