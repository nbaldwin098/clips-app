/**
 * Enable browser push — reusable on profile, watch, live, settings.
 */
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import {
  pushSupported,
  pushConfigured,
  getSavedPushSubscription,
  enableWebPush,
  disableWebPush,
} from '../lib/webPush'
import { getUserSettings, saveUserSettings } from '../lib/storage'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'

export default function EnableNotificationsButton({
  className = '',
  compact = false,
  variant = 'dark', // dark | light | ghost
}) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    setOn(!!getSavedPushSubscription()?.endpoint)
  }, [])

  const run = async () => {
    setBusy(true)
    setNote('')
    if (on) {
      await disableWebPush()
      setOn(false)
      setBusy(false)
      return
    }
    const res = await enableWebPush()
    setBusy(false)
    if (res.ok) {
      setOn(true)
      setNote(t('push.enabled'))
      try {
        const s = getUserSettings()
        saveUserSettings({
          notifications: { ...(s.notifications || {}), pushLive: true, pushChat: true },
        })
      } catch { /* ignore */ }
      return
    }
    if (res.error === 'unsupported') setNote(t('push.unsupported'))
    else if (res.error === 'need_vapid') setNote(t('push.needKey'))
    else if (res.error === 'denied') setNote(t('push.denied'))
    else setNote(res.error || t('push.failed'))
  }

  if (!pushSupported()) return null

  const styles = {
    dark: on
      ? 'border-zinc-600 bg-zinc-800 text-white'
      : 'bg-white text-black hover:bg-zinc-200',
    light: on
      ? 'border border-slate-300 bg-slate-100 text-slate-800'
      : 'bg-sky-600 text-white hover:bg-sky-500',
    ghost: on
      ? 'border border-white/30 bg-white/10 text-white'
      : 'border border-white/40 bg-black/40 text-white hover:bg-white/10',
  }

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <button
        type="button"
        disabled={busy || (!on && !pushConfigured())}
        onClick={run}
        title={!pushConfigured() ? t('push.needKey') : undefined}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 font-semibold disabled:opacity-50',
          compact ? 'h-8 px-2.5 text-[11px]' : 'h-9 px-3 text-xs',
          styles[variant] || styles.dark,
        )}
      >
        {on ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        {busy ? t('common.loading') : on ? t('push.disable') : t('push.enable')}
      </button>
      {note ? <p className="text-[10px] text-zinc-400 max-w-[14rem]">{note}</p> : null}
      {!pushConfigured() && !on ? (
        <p className="text-[10px] text-zinc-500 max-w-[14rem]">{t('push.needKey')}</p>
      ) : null}
    </div>
  )
}
