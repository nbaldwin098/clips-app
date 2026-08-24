import { useState, useEffect } from 'react'
import { getUserSettings, saveUserSettings } from '../../lib/storage'

const DEFAULTS = {
  emailLive: true,
  emailSubs: true,
  emailStrikes: true,
  pushLive: false,
  pushChat: false,
  pushMarketing: false,
}

export default function NotificationsSettings() {
  const [prefs, setPrefs] = useState(DEFAULTS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = getUserSettings()
    if (s.notifications) setPrefs({ ...DEFAULTS, ...s.notifications })
  }, [])

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const save = () => {
    saveUserSettings({ notifications: prefs })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Row = ({ id, label, hint }) => (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-zinc-800 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {hint ? <p className="text-xs text-zinc-500 mt-0.5">{hint}</p> : null}
      </div>
      <input type="checkbox" checked={!!prefs[id]} onChange={() => toggle(id)} className="mt-1" />
    </label>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Notifications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Saved on this device. Email and push are not sent from a server yet except copyright-related mail you configure later.
        </p>
      </div>
      <section className="rounded-xl border border-zinc-800 bg-[#121218] px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 pt-3 pb-1">Email</p>
        <Row id="emailLive" label="Live stream starts" hint="When channels you follow go live — after live is real" />
        <Row id="emailSubs" label="New subscribers" />
        <Row id="emailStrikes" label="Copyright strikes" hint="Keep on for policy mail" />
      </section>
      <section className="rounded-xl border border-zinc-800 bg-[#121218] px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 pt-3 pb-1">On this device</p>
        <Row id="pushLive" label="Live alerts" />
        <Row id="pushChat" label="Chat mentions" />
        <Row id="pushMarketing" label="Product updates" />
      </section>
      <button type="button" onClick={save} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
        {saved ? 'Saved' : 'Save preferences'}
      </button>
    </div>
  )
}
