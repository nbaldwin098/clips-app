import { useEffect, useMemo, useState } from 'react'
import { Youtube, Instagram } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getCreatorContent } from '../../lib/contentService'
import { listVods } from '../../lib/vods'
import { formatPostedAt, postedAtOf } from '../../lib/mediaMeta'
import { formatCount } from '../../lib/uiFormat'
import { getViews } from '../../lib/engagement'
import { cn } from '../../lib/utils'
import {
  SOCIAL_PROVIDERS,
  getSocialConnects,
  connectSocial,
  disconnectSocial,
  setSocialShowOnProfile,
  queueSocialPost,
  listSocialJobs,
  anySocialOAuthConfigured,
} from '../../lib/socialConnects'
import {
  SettingsCard,
  SettingsButton,
  SettingsNotice,
  SettingsPageHeader,
} from '../settings/SettingsTemplates'

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Videos' },
  { id: 'short', label: 'Clips' },
  { id: 'pic', label: 'Pics' },
  { id: 'vod', label: 'VODs' },
]

function typeLabel(type) {
  if (type === 'video') return 'Video'
  if (type === 'pic') return 'Pic'
  if (type === 'vod') return 'VOD'
  return 'Clip'
}

function providerAccepts(providerId, contentType) {
  const meta = SOCIAL_PROVIDERS.find((p) => p.id === providerId)
  if (!meta?.accepts) return true
  return meta.accepts.includes(contentType)
}

function ProviderGlyph({ id, className = 'h-5 w-5' }) {
  if (id === 'youtube') return <Youtube className={className} aria-hidden />
  if (id === 'instagram') return <Instagram className={className} aria-hidden />
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

/**
 * Creator Studio → Socials: connect accounts and push posts / clips / pics / VODs out.
 */
export default function StudioSocialsPanel({ onNavigate }) {
  const { user } = useAuth()
  const uid = user?.id
  const [, bump] = useState(0)
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedProviders, setSelectedProviders] = useState([])
  const [caption, setCaption] = useState('')
  const [handleDraft, setHandleDraft] = useState({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const connects = getSocialConnects(uid)
  const jobs = listSocialJobs(uid, 24)
  const connectedIds = SOCIAL_PROVIDERS.filter((p) => connects[p.id]?.connected).map((p) => p.id)

  const posts = useMemo(() => getCreatorContent(uid, user?.handle) || [], [uid, user?.handle, bump])
  const vods = useMemo(
    () => (listVods(uid) || []).map((v) => ({
      id: v.id,
      title: v.title || 'Past broadcast',
      type: 'vod',
      createdAt: v.endedAt || v.createdAt,
      durationSec: v.durationSec,
    })),
    [uid, bump]
  )

  const catalog = useMemo(() => {
    const rows = [
      ...posts.map((p) => ({
        id: p.id,
        title: p.title || 'Untitled',
        type: p.type === 'pic' ? 'pic' : p.type === 'video' ? 'video' : 'short',
        createdAt: p.createdAt || p.publishedAt || p.importedAt,
        views: getViews(p.id),
      })),
      ...vods,
    ]
    if (typeFilter === 'all') return rows
    return rows.filter((r) => r.type === typeFilter)
  }, [posts, vods, typeFilter])

  const selected = catalog.find((r) => r.id === selectedId) || null

  useEffect(() => {
    if (!selectedId && catalog[0]?.id) setSelectedId(catalog[0].id)
  }, [catalog, selectedId])

  useEffect(() => {
    if (!selected) return
    setCaption((prev) => prev || selected.title || '')
    setSelectedProviders((prev) => {
      const next = connectedIds.filter((id) => providerAccepts(id, selected.type))
      if (!prev.length) return next
      return prev.filter((id) => next.includes(id))
    })
  }, [selected?.id, selected?.type, connectedIds.join(',')])

  const toggleProvider = (id) => {
    setSelectedProviders((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ))
  }

  const onConnect = (providerId) => {
    const handle = handleDraft[providerId] || user?.handle || ''
    const res = connectSocial(uid, providerId, handle, { showOnProfile: true })
    setNote(res.ok ? 'Connected.' : (res.error || 'Could not connect.'))
    bump((n) => n + 1)
  }

  const onPost = () => {
    if (!uid || !selected) return
    setBusy(true)
    setNote('')
    const res = queueSocialPost({
      userId: uid,
      contentId: selected.id,
      title: selected.title,
      caption,
      providers: selectedProviders,
      contentType: selected.type,
    })
    setBusy(false)
    if (!res.ok) {
      setNote(res.error || 'Could not queue.')
      return
    }
    setNote('Queued to selected accounts.')
    bump((n) => n + 1)
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto space-y-4 pb-8">
      <SettingsPageHeader
        title="Socials"
        subtitle="Connect profile links anytime. Publish to networks stays disabled until OAuth is configured."
      />

      <SettingsNotice>
        <p>
          Save handles and toggle Show on profile anytime. Publish is disabled without OAuth client IDs
          (VITE_OAUTH_*_CLIENT_ID). Profile icons still work; we do not fake a successful post.
        </p>
      </SettingsNotice>

      <SettingsCard title="Connected accounts" description="Icon buttons — connect, then choose profile visibility.">
        <div className="flex flex-wrap gap-3">
          {SOCIAL_PROVIDERS.map((p) => {
            const row = connects[p.id]
            const on = !!row?.connected
            return (
              <div key={p.id} className="flex flex-col items-center gap-2 w-[5.5rem]">
                <button
                  type="button"
                  title={p.label}
                  aria-label={p.label}
                  onClick={() => {
                    if (on) {
                      disconnectSocial(uid, p.id)
                      bump((n) => n + 1)
                    } else {
                      onConnect(p.id)
                    }
                  }}
                  className={cn(
                    'h-12 w-12 rounded-xl border inline-flex items-center justify-center',
                    on ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  )}
                >
                  <ProviderGlyph id={p.id} />
                </button>
                {!on ? (
                  <input
                    value={handleDraft[p.id] || ''}
                    onChange={(e) => setHandleDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                    placeholder="@handle"
                    className="h-7 w-full rounded border border-zinc-800 bg-black px-1 text-[10px] text-white text-center"
                    aria-label={`${p.label} handle`}
                  />
                ) : (
                  <label className="flex items-center gap-1 text-[10px] text-zinc-400">
                    <input
                      type="checkbox"
                      checked={row.showOnProfile !== false}
                      onChange={(e) => {
                        setSocialShowOnProfile(uid, p.id, e.target.checked)
                        bump((n) => n + 1)
                      }}
                    />
                    Profile
                  </label>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-zinc-600 mt-3">
          Branding URLs stay in{' '}
          <button type="button" className="underline text-zinc-400" onClick={() => onNavigate?.('settings', 'channel')}>
            Settings → Channel
          </button>
          .
        </p>
      </SettingsCard>

      <div className="grid lg:grid-cols-5 gap-3">
        <SettingsCard
          className="lg:col-span-2"
          title="Your content"
          description="Pick a video, clip, pic, or VOD to send out."
          headerAction={(
            <div className="flex flex-wrap gap-1">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTypeFilter(f.id)}
                  className={cn(
                    'h-7 px-2 text-[11px] font-semibold border',
                    typeFilter === f.id ? 'border-white text-white' : 'border-zinc-800 text-zinc-500'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        >
          <ul className="space-y-1.5 max-h-[360px] overflow-y-auto">
            {catalog.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    'w-full text-left rounded-lg border px-3 py-2 transition',
                    selectedId === row.id
                      ? 'border-white bg-white/5'
                      : 'border-zinc-800 hover:border-zinc-600'
                  )}
                >
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{typeLabel(row.type)}</p>
                  <p className="text-sm text-white truncate">{row.title}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {formatPostedAt(postedAtOf(row) || row.createdAt) || '—'}
                    {row.views != null ? ` · ${formatCount(row.views)} views` : ''}
                    {row.durationSec ? ` · ${Math.round(row.durationSec / 60)} min` : ''}
                  </p>
                </button>
              </li>
            ))}
            {!catalog.length ? (
              <p className="text-xs text-zinc-600 py-4">No content yet — upload or go live first.</p>
            ) : null}
          </ul>
        </SettingsCard>

        <SettingsCard
          className="lg:col-span-3"
          title="Post to socials"
          description={selected ? `Sending: ${selected.title}` : 'Select content on the left.'}
        >
          {!connectedIds.length ? (
            <p className="text-sm text-zinc-500">Connect at least one account above.</p>
          ) : !selected ? (
            <p className="text-sm text-zinc-500">Pick a post, clip, pic, or VOD.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-zinc-500 mb-1.5">Destinations</p>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_PROVIDERS.filter((p) => connects[p.id]?.connected).map((p) => {
                    const ok = providerAccepts(p.id, selected.type)
                    const on = selectedProviders.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!ok}
                        onClick={() => toggleProvider(p.id)}
                        className={cn(
                          'h-10 w-10 rounded-lg border inline-flex items-center justify-center disabled:opacity-40',
                          on ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300'
                        )}
                        title={ok ? p.label : `${p.label} doesn’t accept ${typeLabel(selected.type).toLowerCase()}s`}
                        aria-label={p.label}
                      >
                        <ProviderGlyph id={p.id} className="h-4 w-4" />
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-[11px] text-zinc-500">Caption</span>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  maxLength={2200}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white"
                  placeholder="What should the post say?"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <SettingsButton disabled={busy || !selectedProviders.length || !anySocialOAuthConfigured()} onClick={onPost}>
                  {busy ? 'Queueing…' : anySocialOAuthConfigured() ? 'Post to selected' : 'Publish APIs not connected'}
                </SettingsButton>
                <SettingsButton variant="ghost" onClick={() => onNavigate?.('calabi-studio', 'socials')}>
                  Open Calabi Studio
                </SettingsButton>
              </div>
              {!anySocialOAuthConfigured() ? (
                <p className="text-xs text-zinc-500">
                  Set VITE_OAUTH_*_CLIENT_ID env keys to enable real publish. Profile icons still work.
                </p>
              ) : null}
              {note ? <p className="text-xs text-amber-400">{note}</p> : null}
            </div>
          )}
        </SettingsCard>
      </div>

      <SettingsCard title="Queue" description="Recent social push jobs from this device.">
        {!jobs.length ? (
          <p className="text-xs text-zinc-600">Nothing queued yet.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((j) => (
              <li key={j.id} className="rounded-lg border border-zinc-800 px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-white truncate">{j.title}</p>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">{j.status}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                  {(j.providers || []).map((id) => (
                    <span key={id} className="inline-flex h-6 w-6 items-center justify-center border border-zinc-700 text-zinc-300" title={id}>
                      <ProviderGlyph id={id} className="h-3.5 w-3.5" />
                    </span>
                  ))}
                  <span className="text-[11px] text-zinc-500">
                    {j.contentType || 'short'}
                    {j.at ? ` · ${new Date(j.at).toLocaleString()}` : ''}
                  </span>
                </div>
                {j.caption ? <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{j.caption}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  )
}
