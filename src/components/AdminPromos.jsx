import { useEffect, useState } from 'react'
import { getById } from '../lib/contentService'
import {
  listPromoPresets, listPromotions, draftFromPreset, savePromotion,
  publishPromotion, unpublishPromotion, deletePromotion, syncPromotionsFromCloud,
} from '../lib/promotions'

const empty = {
  headline: '',
  body: '',
  ctaLabel: 'Open',
  destView: 'home',
  destId: '',
  featureContentId: '',
  placement: 'banner',
  startsAt: '',
  endsAt: '',
}

export default function AdminPromos() {
  const [list, setList] = useState(() => listPromotions())
  const [draft, setDraft] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [note, setNote] = useState('')

  const refresh = () => setList(listPromotions())

  useEffect(() => {
    syncPromotionsFromCloud().then(() => refresh())
  }, [])

  const pickPreset = (id) => {
    const row = draftFromPreset(id)
    if (!row) return
    setEditingId(row.id)
    setDraft(row)
    setNote(`Loaded “${id}”. Edit copy, then Save. Nothing is live until you Publish.`)
  }

  const save = () => {
    const row = savePromotion({
      ...empty,
      ...draft,
      id: editingId || draft.id || `promo_${Date.now()}`,
      published: draft.published === true,
    })
    setEditingId(row.id)
    setDraft(row)
    refresh()
    setNote('Saved. Publish to show it on the live site.')
  }

  const publish = (id) => {
    const row = list.find((p) => p.id === id) || draft
    if (row.featureContentId || (row.destView === 'watch' && row.destId)) {
      const item = getById(row.featureContentId || row.destId)
      if (!item) {
        setNote('That video/clip ID is not in the catalog. Paste a real published ID.')
        return
      }
    }
    savePromotion({ ...row, id })
    publishPromotion(id)
    refresh()
    setNote('Published. Other banners are unpublished. Run supabase/migrations/0005_site_promos.sql so every device can load it.')
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4">
        <p className="text-sm font-medium text-white">Fast promotion presets</p>
        <p className="text-[11px] text-zinc-500 mt-1">
          Templates only. They do not invent videos, viewer counts, or sample ads. Publish one banner at a time.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {listPromoPresets().map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPreset(p.id)}
              className="h-8 px-3 rounded-full border border-zinc-700 text-[11px] text-zinc-200 hover:border-white"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#121218] p-4 space-y-3">
        <p className="text-sm font-medium text-white">{editingId ? 'Edit promo' : 'New promo'}</p>
        <label className="block text-xs text-zinc-400">Headline
          <input value={draft.headline || ''} onChange={(e) => setDraft((d) => ({ ...d, headline: e.target.value }))} className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 text-sm text-white" />
        </label>
        <label className="block text-xs text-zinc-400">Body
          <textarea value={draft.body || ''} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 py-2 text-sm text-white" />
        </label>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-400">Button
            <input value={draft.ctaLabel || ''} onChange={(e) => setDraft((d) => ({ ...d, ctaLabel: e.target.value }))} className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 text-sm text-white" />
          </label>
          <label className="block text-xs text-zinc-400">Goes to
            <select value={draft.destView || 'home'} onChange={(e) => setDraft((d) => ({ ...d, destView: e.target.value }))} className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 text-sm text-white">
              {['home', 'explore', 'clips', 'pics', 'live', 'creator-apply', 'advertise', 'checkout', 'dashboard', 'subscriptions', 'help', 'content-rules', 'watch'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs text-zinc-400">Watch / content ID (real catalog id only)
          <input
            value={draft.destView === 'watch' ? (draft.destId || draft.featureContentId || '') : (draft.featureContentId || '')}
            onChange={(e) => setDraft((d) => ({ ...d, destId: e.target.value, featureContentId: e.target.value }))}
            className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 text-sm text-white"
            placeholder="Leave blank unless featuring a published item"
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-400">Start (optional)
            <input type="datetime-local" value={draft.startsAt || ''} onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))} className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 text-sm text-white" />
          </label>
          <label className="block text-xs text-zinc-400">End (optional)
            <input type="datetime-local" value={draft.endsAt || ''} onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))} className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#0e0e10] px-3 text-sm text-white" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="h-9 px-4 rounded-lg border border-zinc-700 text-xs text-white">Save</button>
          {editingId ? (
            <button type="button" onClick={() => publish(editingId)} className="h-9 px-4 rounded-lg bg-white text-black text-xs font-bold">Publish</button>
          ) : null}
        </div>
        {note ? <p className="text-xs text-zinc-400">{note}</p> : null}
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-xs text-zinc-500">No saved promotions yet. Pick a preset.</p>
        ) : list.map((p) => (
          <div key={p.id} className="rounded-xl border border-zinc-800 bg-[#121218] p-3 text-xs text-zinc-400 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-white">{p.headline}</p>
              <p className="mt-0.5">{p.body}</p>
              <p className="mt-1 text-[11px]">
                {p.published ? 'LIVE' : 'draft'} · {p.destView}{p.destId ? `/${p.destId}` : ''} · clicks {p.clicks || 0}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => { setEditingId(p.id); setDraft(p) }} className="h-8 px-2 rounded-lg border border-zinc-700 text-zinc-200">Edit</button>
              {p.published ? (
                <button type="button" onClick={() => { unpublishPromotion(p.id); refresh() }} className="h-8 px-2 rounded-lg border border-zinc-700 text-zinc-200">Unpublish</button>
              ) : (
                <button type="button" onClick={() => publish(p.id)} className="h-8 px-2 rounded-lg bg-white text-black font-bold">Publish</button>
              )}
              <button type="button" onClick={() => { deletePromotion(p.id); if (editingId === p.id) { setEditingId(null); setDraft(empty) } refresh() }} className="h-8 px-2 rounded-lg text-red-400">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
