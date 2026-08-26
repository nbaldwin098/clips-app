import { useEffect, useMemo, useState } from 'react'
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
  queueSocialPost,
  listSocialJobs,
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
    const res = connectSocial(uid, providerId, handle)
    setNote(res.ok ? `Connected ${providerId}.` : (res.error || 'Could not connect.'))
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
    const names = res.job.providers.map((id) => SOCIAL_PROVIDERS.find((p) => p.id === id)?.label || id).join(', ')
    setNote(`Queued to ${names}.`)
    bump((n) => n + 1)
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto space-y-4 pb-8">
      <SettingsPageHeader
        title="Socials"
        subtitle="Connect accounts, then push videos, clips, pics, or VODs out in one tap."
      />

      <SettingsNotice>
        <p>
          Connects are saved on this device until live OAuth keys ship. Queued posts show below — they will publish automatically once provider APIs are wired.
        </p>
      </SettingsNotice>

      <SettingsCard title="Connected accounts" description="YouTube, TikTok, Instagram, X, and Facebook.">
        <div className="space-y-2">
          {SOCIAL_PROVIDERS.map((p) => {
            const row = connects[p.id]
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#0a0a0e] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{p.label}</p>
                  <p className="text-[11px] text-zinc-500">
                    {row?.connected
                      ? `@${row.handle || 'connected'} · accepts ${p.accepts.join(', ')}`
                      : `Not connected · ${p.accepts.join(', ')}`}
                  </p>
                </div>
                {row?.connected ? (
                  <button
                    type="button"
                    className="text-xs text-zinc-300 underline"
                    onClick={() => { disconnectSocial(uid, p.id); bump((n) => n + 1) }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      value={handleDraft[p.id] || ''}
                      onChange={(e) => setHandleDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                      placeholder={`@${user?.handle || 'handle'}`}
                      className="h-8 w-28 rounded-lg border border-zinc-800 bg-black px-2 text-xs text-white"
                    />
                    <SettingsButton onClick={() => onConnect(p.id)}>Connect</SettingsButton>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-zinc-600 mt-3">
          Channel page social links are separate branding URLs — manage those in{' '}
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
                          'h-9 px-3 rounded-lg border text-xs font-semibold disabled:opacity-40',
                          on ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300'
                        )}
                        title={ok ? p.label : `${p.label} doesn’t accept ${typeLabel(selected.type).toLowerCase()}s`}
                      >
                        {p.label}
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
                <SettingsButton disabled={busy || !selectedProviders.length} onClick={onPost}>
                  {busy ? 'Queueing…' : 'Post to selected'}
                </SettingsButton>
                <SettingsButton variant="ghost" onClick={() => onNavigate?.('calabi-studio', 'socials')}>
                  Open Calabi Studio
                </SettingsButton>
              </div>
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
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {(j.contentType || 'short')} · {(j.providers || []).map((id) => SOCIAL_PROVIDERS.find((p) => p.id === id)?.short || id).join(', ')}
                  {j.at ? ` · ${new Date(j.at).toLocaleString()}` : ''}
                </p>
                {j.caption ? <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{j.caption}</p> : null}
                {j.note ? <p className="text-[10px] text-zinc-600 mt-1">{j.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  )
}
