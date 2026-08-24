import { useState } from 'react'
import {
  adsAreRunning, setAdsRunning, getAdSettings, setAdSettings,
  listAdApplications, approveAdApplication, rejectAdApplication,
  listAllCampaigns, saveAdvertiserCampaign, AD_PLACEMENTS, campaignPlacements,
} from '../lib/adEngine'

function Pill({ on, children }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${on ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
      {children}
    </span>
  )
}

const field = 'h-9 w-full rounded-lg border border-zinc-800 bg-black px-2.5 text-xs text-white'

export default function AdminAds() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  const adsOn = adsAreRunning()
  const settings = getAdSettings()
  const adApps = listAdApplications()
  const campaigns = listAllCampaigns()

  const patchSettings = (partial) => {
    setAdSettings(partial)
    refresh()
  }

  const togglePlacement = (campaign, id) => {
    const current = campaignPlacements(campaign)
    const next = current.includes(id) ? current.filter((p) => p !== id) : [...current, id]
    saveAdvertiserCampaign({ ...campaign, placements: next.length ? next : [id] })
    refresh()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Site ads</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Videos use the ExoClick VAST tag as a skippable preroll (skip after 5 seconds, like YouTube). Videos 8 minutes or longer also get mid-rolls. Clip full ads sit every 4–6 clips, never twice in a row and never on a banner. Clip banners sit every 10 clips, never on a full ad. Live viewers get the video tag 30 seconds after they open a stream. Creators can run a separate live tag with !ad. If a tag has no fill, we do not invent a fake ad.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setAdsRunning(!adsOn); refresh() }}
          className={`h-10 px-4 rounded-lg text-xs font-semibold ${adsOn ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-300'}`}
        >
          {adsOn ? 'Ads are ON' : 'Ads are off'}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-4 space-y-4">
        <p className="text-sm font-medium text-white">Where ads show</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {[
            ['videoPreroll', 'Videos', 'ExoClick VAST preroll + mid-roll'],
            ['clipBanner', 'Clips banner', 'Bottom of clip'],
            ['clipInFeed', 'Clips in-feed', 'Between clips'],
            ['picBanner', 'Pics banner', 'Bottom of photo'],
            ['picInFeed', 'Pics in-feed', 'Between photos'],
          ].map(([key, label, hint]) => (
            <button
              key={key}
              type="button"
              onClick={() => patchSettings({ [key]: !settings[key] })}
              className={`rounded-xl border p-3 text-left ${settings[key] ? 'border-white bg-white/10' : 'border-zinc-800 bg-black'}`}
            >
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{hint}</p>
              <p className={`text-[10px] font-bold uppercase mt-2 ${settings[key] ? 'text-white' : 'text-zinc-600'}`}>
                {settings[key] ? 'On' : 'Off'}
              </p>
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <label className="text-[11px] text-zinc-400">Skip videos after (seconds)
            <input
              type="number"
              min="3"
              max="30"
              value={settings.videoSkipAfterSec}
              onChange={(e) => patchSettings({ videoSkipAfterSec: e.target.value })}
              className={`${field} mt-1`}
            />
          </label>
          <p className="text-[11px] text-zinc-500 sm:col-span-2">Clip full ads cycle every 4, then 5, then 6 items. Banners are every 10. They never sit on the same clip or next to each other.</p>
          <label className="text-[11px] text-zinc-400">Pic ad every N items
            <input
              type="number"
              min="2"
              max="24"
              value={settings.picFeedEvery}
              onChange={(e) => patchSettings({ picFeedEvery: e.target.value })}
              className={`${field} mt-1`}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Brand applications</p>
        {adApps.length === 0 ? (
          <p className="text-xs text-zinc-500">No advertisement applications yet.</p>
        ) : adApps.map((a) => (
          <div key={a.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-4 text-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white">{a.businessName}</span>
                <span className="ml-2 text-xs text-zinc-400">{a.contactName} ({a.email})</span>
              </div>
              <Pill on={a.status === 'approved'}>{a.status}</Pill>
            </div>
            <p className="text-xs text-zinc-400">{a.website} · {a.monthlyBudget} · {a.targetAudience}</p>
            {a.campaignGoals ? <p className="text-xs text-zinc-300">"{a.campaignGoals}"</p> : null}
            {a.status === 'approved' && a.account && (
              <div className="p-3 rounded-lg bg-black border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <p className="font-semibold text-white">Portal login (show this once)</p>
                <p>Username <code className="text-white">{a.account.username}</code></p>
                <p>Password <code className="text-white">{a.account.password}</code></p>
              </div>
            )}
            {a.status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={async () => { await approveAdApplication(a.id); refresh() }} className="h-8 px-4 rounded-lg bg-white text-black text-xs font-bold">Approve</button>
                <button type="button" onClick={() => { rejectAdApplication(a.id); refresh() }} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Campaigns</p>
        {campaigns.length === 0 ? (
          <p className="text-xs text-zinc-500">No campaigns. Approve a brand, then edit placements here.</p>
        ) : campaigns.map((c) => {
          const places = campaignPlacements(c)
          const patch = (partial) => { try { saveAdvertiserCampaign({ ...c, ...partial }); refresh() } catch {} }
          return (
            <div key={c.id} className="rounded-2xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{c.headline || 'Untitled ad'}</p>
                  <p className="text-[11px] text-zinc-500">{c.businessName} · {c.impressions || 0} views · {c.clicks || 0} clicks</p>
                </div>
                <Pill on={c.status === 'active'}>{c.status}</Pill>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input defaultValue={c.headline || ''} placeholder="Headline" onBlur={(e) => patch({ headline: e.target.value })} className={field} />
                <input defaultValue={c.ctaText || ''} placeholder="Button text" onBlur={(e) => patch({ ctaText: e.target.value })} className={field} />
                <input defaultValue={c.body || ''} placeholder="Short line under the headline" onBlur={(e) => patch({ body: e.target.value })} className={`${field} sm:col-span-2`} />
                <input defaultValue={c.targetUrl || ''} placeholder="https link" onBlur={(e) => patch({ targetUrl: e.target.value })} className={field} />
                <input defaultValue={c.imageUrl || ''} placeholder="Image URL (optional)" onBlur={(e) => patch({ imageUrl: e.target.value })} className={field} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Placements</p>
                <div className="flex flex-wrap gap-1.5">
                  {AD_PLACEMENTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.hint}
                      onClick={() => togglePlacement(c, p.id)}
                      className={`h-8 px-2.5 rounded-lg text-[11px] font-medium ${places.includes(p.id) ? 'bg-white text-black' : 'border border-zinc-800 text-zinc-400'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-2">
                <select value={c.status} onChange={(e) => patch({ status: e.target.value })} className={field}>
                  <option value="draft">draft</option>
                  <option value="scheduled">scheduled</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="ended">ended</option>
                </select>
                <label className="text-[10px] text-zinc-500">Skip after
                  <input type="number" min="3" max="30" defaultValue={c.skipAfterSec || settings.videoSkipAfterSec} onBlur={(e) => patch({ skipAfterSec: Number(e.target.value) || 5 })} className={`${field} mt-1`} />
                </label>
                <label className="text-[10px] text-zinc-500">Start
                  <input type="datetime-local" defaultValue={c.startsAt ? c.startsAt.slice(0, 16) : ''} onBlur={(e) => patch({ startsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })} className={`${field} mt-1`} />
                </label>
                <label className="text-[10px] text-zinc-500">End
                  <input type="datetime-local" defaultValue={c.endsAt ? c.endsAt.slice(0, 16) : ''} onBlur={(e) => patch({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })} className={`${field} mt-1`} />
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
