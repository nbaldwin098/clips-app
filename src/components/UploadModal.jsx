import { useState, useRef, useMemo } from 'react'
import { X, Upload, Film } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishLocalMedia, getShortsFeed, getById } from '../lib/contentService'
import { saveDraft } from '../lib/youtubeParity'
import { storeMediaBlob } from '../lib/videoStorage'
import { mergeTags, parseChaptersInput } from '../lib/mediaMeta'
import SoundPicker from './SoundPicker'
import { postDeniedMessage } from '../lib/trustSafety'

export default function UploadModal({
  open, onClose, initialKind = 'video', initialSound = null, initialStitch = null, onOpenAuth,
}) {
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState(initialKind === 'short' ? 'short' : 'video')
  const [sound, setSound] = useState(initialSound)
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState('idle')
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const [chapters, setChapters] = useState([{ t: '0:00', title: '' }])
  const [captionsText, setCaptionsText] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [stitchId, setStitchId] = useState(initialStitch?.id || '')
  const [priceUsd, setPriceUsd] = useState('')

  const stitchOptions = useMemo(() => getShortsFeed(user?.id || null).slice(0, 40), [user?.id, open])
  const stitchItem = stitchId ? (getById(stitchId) || initialStitch) : initialStitch

  if (!open) return null

  const reset = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setKind(initialKind === 'short' ? 'short' : 'video')
    setSound(initialSound)
    setTags('')
    setStatus('idle')
    setMeta(null)
    setError('')
    setChapters([{ t: '0:00', title: '' }])
    setCaptionsText('')
    setScheduledFor('')
    setStitchId(initialStitch?.id || '')
    setDraftSaved(false)
    setPriceUsd('')
  }

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setMeta(null)
    setError('')
    if (!title.trim()) setTitle(String(f.name || '').replace(/\.[^.]+$/, '') || '')
  }

  const payload = () => ({
    type: kind,
    title: title.trim().slice(0, 120),
    description: description.trim().slice(0, 5000),
    sound,
    tags: mergeTags(tags, description),
    stitchOf: stitchId || initialStitch?.id || null,
    chapters: parseChaptersInput(chapters),
    captionsText: captionsText.trim(),
    scheduledFor: scheduledFor || null,
    priceUsd: priceUsd ? Number(priceUsd) : 0,
  })

  const submit = async (asDraft = false) => {
    if (!file) {
      setError('Choose a video file.')
      return
    }
    if (!title.trim()) {
      setError('Add a title.')
      return
    }
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    const denied = postDeniedMessage(user)
    if (denied) {
      setError(denied)
      return
    }
    setStatus('reading')
    setError('')
    try {
      const published = await publishLocalMedia(file, user, {
        ...payload(),
        status: asDraft ? 'draft' : 'published',
      })
      if (!published.ok) {
        setError(published.error || 'Could not save this file.')
        setStatus('error')
        return
      }
      setMeta({
        name: published.item?.title || title,
        sizeMb: Math.round((file.size / (1024 * 1024)) * 10) / 10,
        width: published.item?.width || 1920,
        height: published.item?.height || 1080,
        duration: published.item?.durationSec || 0,
        type: published.item?.type || kind,
        soundTitle: published.item?.soundTitle || sound?.title || null,
        status: published.status,
      })
      setStatus('ready')
      setDraftSaved(asDraft || published.status === 'draft' || published.status === 'scheduled')
    } catch (err) {
      setStatus('error')
      setError(err?.message || 'Could not read this file.')
    }
  }

  const saveAsDraft = async () => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    const row = saveDraft({
      userId: user.id,
      title: title.trim(),
      description: description.trim(),
      tags,
      kind,
      sound,
      chapters,
      captionsText,
      stitchOf: stitchId || null,
      scheduledFor,
      hasFile: !!file,
    })
    if (file) {
      try { await storeMediaBlob(row.id, file) } catch {}
    }
    setDraftSaved(true)
    setError('')
    if (file) {
      await submit(true)
      return
    }
    setStatus('ready')
    setMeta({ name: title.trim() || 'Untitled draft', type: kind, soundTitle: sound?.title || null, status: 'draft' })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => { reset(); onClose() }} />
      <div className="relative w-full max-w-md rounded-2xl bg-[#1f1f23] shadow-2xl border border-[#2f2f37] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f37] sticky top-0 bg-[#1f1f23] z-10">
          <h2 className="text-base font-semibold text-[#efeff1]">Upload</h2>
          <button type="button" onClick={() => { reset(); onClose() }} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {!isAuthenticated && <p className="text-xs text-amber-400">Sign in first.</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setKind('short')} className={`flex-1 h-9 rounded-lg text-xs font-medium ${kind === 'short' ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-400'}`}>Clip</button>
            <button type="button" onClick={() => setKind('video')} className={`flex-1 h-9 rounded-lg text-xs font-medium ${kind === 'video' ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-400'}`}>Video</button>
          </div>

          <label className="block text-xs text-zinc-400">Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#000000] px-3 text-sm text-white" placeholder="What is this about?" />
          </label>
          <label className="block text-xs text-zinc-400">Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#000000] px-3 py-2 text-sm text-white" placeholder="Tell viewers more… #tags in the text are picked up" />
          </label>

          <label className="block text-xs text-zinc-400">Tags
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#000000] px-3 text-sm text-white" placeholder="music, gaming, comedy" />
          </label>

          <label className="block text-xs text-zinc-400">Price (USD, optional)
            <input
              type="number"
              min="0"
              max="50"
              step="0.01"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#000000] px-3 text-sm text-white"
              placeholder="0 = free. Following is always free."
            />
          </label>

          <SoundPicker value={sound} onChange={setSound} onOpenAuth={onOpenAuth} />

          {kind === 'short' && (
            <label className="block text-xs text-zinc-400">Stitch a clip
              <select
                value={stitchId}
                onChange={(e) => setStitchId(e.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#000000] px-3 text-sm text-white"
              >
                <option value="">None</option>
                {stitchItem && !stitchOptions.some((s) => s.id === stitchItem.id) ? (
                  <option value={stitchItem.id}>{stitchItem.title || 'Original'}</option>
                ) : null}
                {stitchOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title || s.id}</option>
                ))}
              </select>
            </label>
          )}

          <div className="space-y-2">
            <p className="text-xs text-zinc-400">Chapters (time + title)</p>
            {chapters.map((ch, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={ch.t}
                  onChange={(e) => setChapters((rows) => rows.map((r, idx) => (idx === i ? { ...r, t: e.target.value } : r)))}
                  className="w-20 h-9 rounded-lg border border-zinc-700 bg-[#000000] px-2 text-xs text-white"
                  placeholder="0:00"
                />
                <input
                  value={ch.title}
                  onChange={(e) => setChapters((rows) => rows.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))}
                  className="flex-1 h-9 rounded-lg border border-zinc-700 bg-[#000000] px-2 text-xs text-white"
                  placeholder="Chapter title"
                />
              </div>
            ))}
            <button type="button" onClick={() => setChapters((rows) => [...rows, { t: '', title: '' }])} className="text-[11px] text-zinc-400 hover:text-white">
              + Add chapter
            </button>
          </div>

          <label className="block text-xs text-zinc-400">Captions (paste transcript or VTT)
            <textarea
              value={captionsText}
              onChange={(e) => setCaptionsText(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#000000] px-3 py-2 text-xs text-white"
              placeholder="Plain lines, or 00:00.000 --> 00:04.000"
            />
          </label>

          <label className="block text-xs text-zinc-400">Schedule publish (optional)
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-zinc-700 bg-[#000000] px-3 text-sm text-white"
            />
          </label>

          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
          <button type="button" onClick={() => inputRef.current?.click()} className="w-full h-24 rounded-xl border border-dashed border-zinc-700 bg-[#18181b] hover:bg-[#26262c] flex flex-col items-center justify-center gap-2">
            <Upload className="h-5 w-5 text-zinc-300" />
            <span className="text-sm text-zinc-200">{file ? file.name : 'Choose video file'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={saveAsDraft} disabled={status === 'reading'} className="h-10 rounded-lg border border-zinc-700 text-zinc-200 text-sm disabled:opacity-50">
              Save draft
            </button>
            <button type="button" onClick={() => submit(false)} disabled={status === 'reading' || !file} className="h-10 rounded-lg bg-white text-black text-sm font-bold disabled:opacity-50">
              {status === 'reading' ? 'Uploading…' : scheduledFor ? 'Schedule' : 'Publish'}
            </button>
          </div>

          {status === 'error' && <p className="text-sm text-red-400">{error}</p>}
          {draftSaved && !meta && <p className="text-xs text-zinc-400">Draft saved. Open Studio to publish later.</p>}
          {meta && (
            <div className="rounded-lg border border-zinc-700 bg-[#18181b] p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-medium text-white"><Film className="h-4 w-4" />{meta.name}</div>
              <p className="text-xs text-zinc-400">{meta.sizeMb ? `${meta.sizeMb} MB · ` : ''}{meta.type}{meta.soundTitle ? ` · ${meta.soundTitle}` : ''}</p>
              <p className={`text-xs ${meta.status === 'draft' || meta.status === 'scheduled' ? 'text-amber-400' : 'text-green-400'}`}>
                {meta.status === 'draft' ? 'Saved as a draft' : meta.status === 'scheduled' ? 'Scheduled' : 'Uploaded'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
