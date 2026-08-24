import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStreamSettings, setStreamSettings } from '../../lib/streamSettings'
import { ensureStreamKey, rotateStreamKey } from '../../lib/streamKeys'
import { getVodChannel, setVodChannel } from '../../lib/vods'
import {
  cueLiveAd,
  getLiveAdState,
  scheduleLiveAd,
  setLiveAdsPerHour,
  snoozeLiveAds,
  cancelLiveAdSchedule,
  LIVE_VIEWER_AD_DELAY_SEC,
  LIVE_ADS_PER_HOUR_MAX,
  LIVE_SNOOZE_SEC,
  LIVE_HOURLY_AD_CAP_SEC,
  MANUAL_AD_BREAKS,
  manualAdCooldownSec,
  liveAdIntervalFromPerHour,
} from '../../lib/liveAds'

export default function StreamSettings() {
  const { user } = useAuth()
  const initial = getStreamSettings(user?.id)
  const vod = getVodChannel(user?.id)
  const [latency, setLatency] = useState(initial.latency || 'low')
  const [quality, setQuality] = useState(initial.defaultQuality || '720p30')
  const [title, setTitle] = useState(initial.streamTitleTemplate || '')
  const [key, setKey] = useState(() => (user?.id ? ensureStreamKey(user.id) : ''))
  const [vodOn, setVodOn] = useState(!!vod.enabled)
  const [vodHandle, setVodHandle] = useState(vod.handle || (user?.handle ? `${user.handle}vods` : ''))
  const [autoPub, setAutoPub] = useState(!!vod.autoPublish)
  const [vis, setVis] = useState(vod.visibility || 'private')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const liveAds = getLiveAdState(user?.id)
  const [adsPerHour, setAdsPerHour] = useState(() => liveAds.adsPerHour || 0)
  const [adInMin, setAdInMin] = useState('10')
  const [adNote, setAdNote] = useState('')
  const [, bumpAds] = useState(0)
  const refreshAds = () => bumpAds((n) => n + 1)
  const adState = getLiveAdState(user?.id)

  useEffect(() => {
    if (!user?.id) return
    setStreamSettings(user.id, {
      latency,
      defaultQuality: quality,
      streamTitleTemplate: title,
      storePastBroadcasts: true,
      autoPublishVod: autoPub,
      vodVisibility: vis,
    })
    setVodChannel(user.id, {
      enabled: vodOn,
      handle: vodHandle,
      autoPublish: autoPub,
      visibility: vis,
    }, user)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [user?.id, latency, quality, title, vodOn, vodHandle, autoPub, vis])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Stream & Ingest</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Live ingest is not connected. Your stream key is saved on this device for when OBS can connect. Ended lobbies still get a copy under VODs.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Stream key</p>
        <code className="block text-xs break-all text-zinc-300 bg-black border border-zinc-800 rounded-lg px-3 py-2">{key || 'Sign in to create a key'}</code>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold"
            onClick={async () => {
              if (!key) return
              await navigator.clipboard.writeText(key)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? 'Copied' : 'Copy key'}
          </button>
          <button
            type="button"
            className="h-9 px-3 rounded-lg border border-zinc-700 text-white text-xs"
            onClick={() => user?.id && setKey(rotateStreamKey(user.id))}
          >
            Rotate key
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Xbox, PS5, and PC screens</p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          This site does not have a live ingest server yet, so a console picture cannot land on other people’s screens from here. Keep the stream key for OBS when ingest ships.
        </p>
        <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-5">
          <li>
            <strong className="text-zinc-200">PC:</strong> On Live, use Share this screen for a preview on this browser only. For a real broadcast later, OBS (or similar) will use the stream key plus an ingest address we will print here — we do not invent one now.
          </li>
          <li>
            <strong className="text-zinc-200">Xbox / PS5:</strong> Those consoles only push to their own apps (Twitch, YouTube). To send a game to a PC first, use an HDMI capture card, then OBS on the PC. There is no Xbox or PS5 setting that talks to calabi.us today.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Second channel for VODs</p>
        <p className="text-xs text-zinc-500">Every ended lobby is copied to Studio → VODs. Turn on a second channel if you want public VOD posts under another handle. Keep them private to stay on the main account only.</p>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={vodOn} onChange={(e) => setVodOn(e.target.checked)} />
          Enable VOD channel
        </label>
        <label className="block max-w-xs text-xs text-zinc-400">
          VOD handle
          <input value={vodHandle} onChange={(e) => setVodHandle(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white" />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={autoPub} onChange={(e) => setAutoPub(e.target.checked)} />
          Auto-post VODs to that channel
        </label>
        <select value={vis} onChange={(e) => setVis(e.target.value)} className="max-w-xs h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white">
          <option value="private">Keep private</option>
          <option value="public">Public on VOD channel</option>
        </select>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Live ads</p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Viewers get the video ad tag {LIVE_VIEWER_AD_DELAY_SEC} seconds after they open your stream. Set 1–5 automated ads per hour below. While live, use 60s / 90s / 3m manual breaks and Snooze ads 5m on the Live page. Manual cooldowns scale with break length (60s→1.5m, 90s→4.5m, 3m→9m). A manual ad resets the automated timer. Max {LIVE_HOURLY_AD_CAP_SEC / 60} minutes of ad time per hour combined.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-9 px-3 rounded-lg border border-zinc-700 text-white text-xs font-semibold"
            onClick={() => {
              if (!user?.id) return
              snoozeLiveAds(user.id)
              setAdNote(`All ads snoozed for ${LIVE_SNOOZE_SEC / 60} minutes.`)
              refreshAds()
            }}
          >
            Snooze all ads 5m
          </button>
          {MANUAL_AD_BREAKS.map((sec) => (
            <button
              key={sec}
              type="button"
              className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold"
              onClick={() => {
                if (!user?.id) return
                const res = cueLiveAd(user.id, 'live-creator', { kind: 'manual', breakSec: sec })
                const cd = manualAdCooldownSec(sec)
                setAdNote(res.ok
                  ? `Manual ${sec}s ad queued. Cooldown after it ends: ${Math.round(cd / 60)}m.`
                  : (res.error || 'Could not run ad.'))
                refreshAds()
              }}
            >
              Manual {sec === 180 ? '3m' : `${sec}s`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">
            Play one in
            <input
              value={adInMin}
              onChange={(e) => setAdInMin(e.target.value)}
              className="mt-1 w-20 h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white"
            />
          </label>
          <span className="text-xs text-zinc-500 pb-3">minutes</span>
          <button
            type="button"
            className="h-10 px-3 rounded-lg border border-zinc-700 text-white text-xs"
            onClick={() => {
              if (!user?.id) return
              const mins = Math.max(1, Number(adInMin) || 0)
              const res = scheduleLiveAd(user.id, Date.now() + mins * 60 * 1000)
              setAdNote(res.ok ? `Scheduled in ${mins}m.` : (res.error || 'Could not schedule.'))
              refreshAds()
            }}
          >
            Schedule
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">
            Mid-stream ads per hour
            <select
              value={adsPerHour}
              onChange={(e) => setAdsPerHour(Number(e.target.value))}
              className="mt-1 block w-28 h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white"
            >
              <option value={0}>Off</option>
              {Array.from({ length: LIVE_ADS_PER_HOUR_MAX }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="h-10 px-3 rounded-lg border border-zinc-700 text-white text-xs"
            onClick={() => {
              if (!user?.id) return
              const used = setLiveAdsPerHour(user.id, adsPerHour)
              const gap = liveAdIntervalFromPerHour(used)
              setAdNote(
                used
                  ? `About ${used} ad${used === 1 ? '' : 's'} per hour (every ${Math.round(gap / 60)}m).`
                  : 'Auto repeat is off.',
              )
              refreshAds()
            }}
          >
            Save
          </button>
        </div>
        {(adState.schedules || []).length ? (
          <ul className="text-xs text-zinc-400 space-y-1">
            {adState.schedules.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span>At {new Date(s.at).toLocaleTimeString()}</span>
                <button
                  type="button"
                  className="text-white underline"
                  onClick={() => { cancelLiveAdSchedule(user.id, s.id); refreshAds() }}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-zinc-600">No one-off times queued.</p>
        )}
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Chat (creator or mod): <code className="text-zinc-300">!ad</code> now, <code className="text-zinc-300">!ad 90s</code>, <code className="text-zinc-300">!ad snooze</code>, <code className="text-zinc-300">!ad 3/h</code> (automated), <code className="text-zinc-300">!ad off</code>, <code className="text-zinc-300">!ads</code> status. Manual cooldowns follow break length. Hourly cap is {LIVE_HOURLY_AD_CAP_SEC / 60} minutes of ads.
        </p>
        {adNote ? <p className="text-[11px] text-white">{adNote}</p> : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Preferences on this device</h2>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-zinc-400">Preferred quality</span>
          <select value={quality} onChange={(e) => setQuality(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100">
            <option value="1080p30">1080p30</option>
            <option value="720p30">720p30</option>
            <option value="480p30">480p30</option>
          </select>
        </label>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-zinc-400">Latency preference</span>
          <select value={latency} onChange={(e) => setLatency(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <label className="block max-w-md">
          <span className="text-xs font-medium text-zinc-400">Title template</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100" placeholder="Optional" />
        </label>
        <p className="text-[11px] text-zinc-500">{saved ? 'Saved' : 'Saved as you change these.'}</p>
      </section>
    </div>
  )
}
