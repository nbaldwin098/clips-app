import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import {
  SOCIAL_PROVIDERS,
  getSocialConnects,
  connectSocial,
  disconnectSocial,
  socialOAuthConfigured,
  startSocialOAuth,
  consumeOAuthReturn,
} from '../../lib/socialConnects'
import {
  SettingsCard,
  SettingsPageHeader,
} from '../settings/SettingsTemplates'

function ProviderGlyph({ id, className = 'h-5 w-5' }) {
  if (id === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
      </svg>
    )
  }
  if (id === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11 1.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      </svg>
    )
  }
  if (id === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M14.5 3h2.1c.2 1.5 1.1 2.8 2.4 3.6v2.2a6.3 6.3 0 0 1-2.5-.7v5.4a5.4 5.4 0 1 1-5.4-5.4c.3 0 .6 0 .9.1v2.3a3.1 3.1 0 1 0 2.2 3V3z" />
      </svg>
    )
  }
  if (id === 'x') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M4 4h4.1l4 5.4L16.7 4H20l-6.2 7.2L20.5 20H16.4l-4.4-5.9L7.3 20H4l6.5-7.6L4 4z" />
      </svg>
    )
  }
  if (id === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v6h3v-6h2.4l.6-3H13v-2c0-.6.4-1 1-1z" />
      </svg>
    )
  }
  return <span className="text-xs font-bold">{id.slice(0, 2).toUpperCase()}</span>
}

/** Creator Studio → Socials: connect / disconnect accounts. */
export default function StudioSocialsPanel() {
  const { user } = useAuth()
  const uid = user?.id
  const [, bump] = useState(0)
  const [handleDraft, setHandleDraft] = useState({})
  const [note, setNote] = useState('')

  const connects = getSocialConnects(uid)

  useEffect(() => {
    if (!uid) return
    const ret = consumeOAuthReturn(uid)
    if (ret) {
      setNote(ret.ok ? `Connected ${ret.provider}.` : `Could not connect.`)
      bump((n) => n + 1)
    }
  }, [uid])

  const onConnect = (providerId) => {
    if (socialOAuthConfigured(providerId)) {
      const oauth = startSocialOAuth(providerId, { state: uid })
      if (oauth.ok) return
    }
    const handle = handleDraft[providerId] || user?.handle || ''
    const res = connectSocial(uid, providerId, handle, { showOnProfile: true })
    setNote(res.ok ? 'Connected.' : (res.error || 'Could not connect.'))
    bump((n) => n + 1)
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto space-y-4 pb-8">
      <SettingsPageHeader title="Socials" subtitle="Connect or disconnect accounts." />

      <SettingsCard title="Accounts">
        <ul className="space-y-2">
          {SOCIAL_PROVIDERS.map((p) => {
            const row = connects[p.id]
            const on = !!row?.connected
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 border border-neutral-200 px-3 py-2"
              >
                <span className={cn(
                  'h-9 w-9 inline-flex items-center justify-center border',
                  on ? 'border-white bg-white text-black' : 'border-neutral-200 text-neutral-700'
                )}
                >
                  <ProviderGlyph id={p.id} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-900">{p.label}</p>
                  {on ? (
                    <p className="text-[11px] text-neutral-500 truncate">{row.handle || 'Connected'}</p>
                  ) : (
                    <input
                      value={handleDraft[p.id] || ''}
                      onChange={(e) => setHandleDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                      placeholder="@handle"
                      className="mt-1 h-8 w-full max-w-[12rem] border border-neutral-200 bg-white px-2 text-xs text-neutral-900"
                      aria-label={`${p.label} handle`}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (on) {
                      disconnectSocial(uid, p.id)
                      bump((n) => n + 1)
                      setNote('')
                    } else {
                      onConnect(p.id)
                    }
                  }}
                  className="h-8 px-3 text-xs font-semibold border border-neutral-200 text-zinc-200 hover:border-white"
                >
                  {on ? 'Disconnect' : 'Connect'}
                </button>
              </li>
            )
          })}
        </ul>
        {note ? <p className="text-xs text-amber-400 mt-3">{note}</p> : null}
      </SettingsCard>
    </div>
  )
}
