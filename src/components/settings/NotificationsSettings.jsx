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

  const toggle = (key) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  const save = () => {
    saveUserSettings({ notifications: prefs })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Row = ({ id, label, hint }) => (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      <input
        type="checkbox"
        checked={!!prefs[id]}
        onChange={() => toggle(id)}
        className="mt-1 rounded border-slate-300 text-[#000000] focus:ring-[#000000]"
      />
    </label>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">Email and push preferences for this account.</p>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-3 pb-1">Email</p>
        <Row id="emailLive" label="Live stream starts" hint="When channels you follow go live" />
        <Row id="emailSubs" label="New subscribers" hint="Creator accounts only" />
        <Row id="emailStrikes" label="Copyright strikes" hint="Required for policy compliance" />
      </section>
      <section className="rounded-xl border border-slate-200 bg-white px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-3 pb-1">Push</p>
        <Row id="pushLive" label="Live alerts" />
        <Row id="pushChat" label="Chat mentions" />
        <Row id="pushMarketing" label="Product updates" />
      </section>
      <button onClick={save} className="h-9 px-4 rounded-lg bg-[#000000] text-white text-sm font-medium hover:bg-[#27272a]">
        {saved ? 'Saved' : 'Save preferences'}
      </button>
    </div>
  )
}
