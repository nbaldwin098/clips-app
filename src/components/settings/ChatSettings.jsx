import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStreamSettings, setStreamSettings } from '../../lib/streamSettings'
import { getUserSettings, saveUserSettings } from '../../lib/storage'

function audienceFromStream(s) {
  if (
    s.chatEveryone !== undefined
    || s.chatFollowers !== undefined
    || s.chatPremium !== undefined
  ) {
    return {
      chatEveryone: s.chatEveryone !== false,
      chatFollowers: !!s.chatFollowers,
      chatPremium: !!s.chatPremium,
    }
  }
  if (s.subscriberOnlyChat) {
    return { chatEveryone: false, chatFollowers: true, chatPremium: true }
  }
  return { chatEveryone: true, chatFollowers: false, chatPremium: false }
}

export default function ChatSettings() {
  const { user } = useAuth()
  const stream = getStreamSettings(user?.id)
  const initialAudience = audienceFromStream(stream)
  const [slowMode, setSlowMode] = useState(stream.slowModeSeconds || 0)
  const [chatEveryone, setChatEveryone] = useState(initialAudience.chatEveryone)
  const [chatFollowers, setChatFollowers] = useState(initialAudience.chatFollowers)
  const [chatPremium, setChatPremium] = useState(initialAudience.chatPremium)
  const [blockedTerms, setBlockedTerms] = useState(() => getUserSettings().blockedTerms || '')
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const s = getStreamSettings(user?.id)
    const a = audienceFromStream(s)
    setSlowMode(s.slowModeSeconds || 0)
    setChatEveryone(a.chatEveryone)
    setChatFollowers(a.chatFollowers)
    setChatPremium(a.chatPremium)
    setBlockedTerms(getUserSettings().blockedTerms || '')
    setReady(true)
  }, [user?.id])

  useEffect(() => {
    if (!ready) return
    setStreamSettings(user?.id, {
      slowModeSeconds: Number(slowMode) || 0,
      chatEveryone,
      chatFollowers,
      chatPremium,
      // Backward compat for older chat gates
      subscriberOnlyChat: !chatEveryone && (chatFollowers || chatPremium),
    })
    saveUserSettings({ blockedTerms })
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [ready, user?.id, slowMode, chatEveryone, chatFollowers, chatPremium, blockedTerms])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Chat</h1>
        <p className="mt-1 text-sm text-zinc-500">Slow mode, audience, and blocked terms.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Rate limiting</h2>
        <label className="block max-w-xs">
          <span className="text-xs font-medium text-zinc-400">Slow mode (seconds)</span>
          <select value={slowMode} onChange={(e) => setSlowMode(Number(e.target.value))} className="mt-1 w-full h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100">
            <option value={0}>Off</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Audience</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={chatEveryone} onChange={(e) => setChatEveryone(e.target.checked)} />
          <span className="text-sm text-zinc-300">Everyone</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={chatFollowers} onChange={(e) => setChatFollowers(e.target.checked)} />
          <span className="text-sm text-zinc-300">Followers</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={chatPremium} onChange={(e) => setChatPremium(e.target.checked)} />
          <span className="text-sm text-zinc-300">Premium</span>
        </label>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Blocked terms</h2>
        <textarea
          value={blockedTerms}
          onChange={(e) => setBlockedTerms(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-zinc-800 bg-[#000000] px-3 py-2 text-sm text-zinc-100"
          placeholder="One phrase per line"
        />
        <p className="text-[11px] text-zinc-500">{saved ? 'Saved' : 'Saved as you type.'}</p>
      </section>
    </div>
  )
}
