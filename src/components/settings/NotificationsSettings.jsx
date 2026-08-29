import { useState, useEffect } from 'react'
import { getUserSettings, saveUserSettings } from '../../lib/storage'
import {
  pushSupported,
  pushConfigured,
  getSavedPushSubscription,
  enableWebPush,
  disableWebPush,
} from '../../lib/webPush'
import { t } from '../../lib/i18n'
import { SettingsButton } from './SettingsTemplates'

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
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushNote, setPushNote] = useState('')

  useEffect(() => {
    const s = getUserSettings()
    if (s.notifications) setPrefs({ ...DEFAULTS, ...s.notifications })
    setPushOn(!!getSavedPushSubscription()?.endpoint)
    setReady(true)
  }, [])

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  useEffect(() => {
    if (!ready) return
    saveUserSettings({ notifications: prefs })
    setSaved(true)
    const tmr = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(tmr)
  }, [prefs, ready])

  const onEnablePush = async () => {
    setPushBusy(true)
    setPushNote('')
    const res = await enableWebPush()
    setPushBusy(false)
    if (res.ok) {
      setPushOn(true)
      setPushNote(t('push.enabled'))
      setPrefs((p) => ({ ...p, pushLive: true }))
      return
    }
    if (res.error === 'unsupported') setPushNote(t('push.unsupported'))
    else if (res.error === 'need_vapid') setPushNote(t('push.needKey'))
    else if (res.error === 'denied') setPushNote(t('push.denied'))
    else setPushNote(res.error || 'Could not enable push.')
  }

  const onDisablePush = async () => {
    setPushBusy(true)
    await disableWebPush()
    setPushBusy(false)
    setPushOn(false)
    setPushNote('')
  }

  const Row = ({ id, label, hint }) => (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-neutral-200 last:border-0">
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        {hint ? <p className="text-xs text-neutral-500 mt-0.5">{hint}</p> : null}
      </div>
      <input type="checkbox" checked={!!prefs[id]} onChange={() => toggle(id)} className="mt-1" />
    </label>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Notifications</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Preference toggles save on this device. Browser push needs a VAPID public key
          (see docs/INFRA.md). Email delivery needs the mail Edge Function.
        </p>
      </div>
      <section className="rounded-xl border border-neutral-200 bg-white px-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 pt-3 pb-1">Email</p>
        <Row id="emailLive" label="Live stream starts" hint="When channels you follow go live — after live is real" />
        <Row id="emailSubs" label="New followers" />
        <Row id="emailStrikes" label="Copyright strikes" hint="Keep on for policy mail" />
      </section>
      <section className="rounded-xl border border-neutral-200 bg-white px-4 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 pt-3 pb-1">Browser push</p>
        {!pushSupported() ? (
          <p className="text-sm text-neutral-500 py-3">{t('push.unsupported')}</p>
        ) : (
          <div className="py-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {!pushOn ? (
                <SettingsButton
                  disabled={pushBusy || !pushConfigured()}
                  onClick={onEnablePush}
                  title={!pushConfigured() ? t('push.needKey') : undefined}
                >
                  {t('push.enable')}
                </SettingsButton>
              ) : (
                <SettingsButton variant="ghost" disabled={pushBusy} onClick={onDisablePush}>
                  {t('push.disable')}
                </SettingsButton>
              )}
            </div>
            {!pushConfigured() ? (
              <p className="text-xs text-neutral-500">
                {t('push.needKey')} Enable stays off until <code className="text-neutral-600">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> is set.
              </p>
            ) : null}
            {pushNote ? <p className="text-xs text-neutral-600">{pushNote}</p> : null}
          </div>
        )}
        <Row id="pushLive" label="Live alerts" />
        <Row id="pushChat" label="Chat mentions" />
        <Row id="pushMarketing" label="Product updates" />
      </section>
      <p className="text-[11px] text-neutral-500">{saved ? 'Saved' : 'Saved as you change these.'}</p>
    </div>
  )
}
