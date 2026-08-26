import { useRef, useState } from 'react'
import { Clapperboard, Film, Image as ImageIcon, Radio, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishPhoto } from '../lib/picsService'
import { cn } from '../lib/utils'

const MODES = [
  { id: 'video', label: 'Video', hint: 'Long-form · up to 24h', Icon: Film },
  { id: 'clip', label: 'Clip', hint: 'Vertical · max 60s', Icon: Clapperboard },
  { id: 'pic', label: 'Pic', hint: 'Photo post', Icon: ImageIcon },
  { id: 'live', label: 'Go live', hint: 'Open live lobby', Icon: Radio },
]

export default function CreatePage({ onCreate, onOpenAuth, onNavigate }) {
  const { isAuthenticated, user } = useAuth()
  const picRef = useRef(null)
  const [picBusy, setPicBusy] = useState(false)
  const [picError, setPicError] = useState('')
  const [mode, setMode] = useState('video')

  const requireAuth = () => {
    if (isAuthenticated) return true
    onOpenAuth?.()
    return false
  }

  const onPickPic = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !requireAuth()) return
    setPicBusy(true)
    setPicError('')
    try {
      const res = await publishPhoto(file, user)
      if (!res.ok) {
        setPicError(res.error || 'Upload failed.')
        return
      }
      if (res.item?.id) onNavigate?.('pics', res.item.id)
      else onNavigate?.('pics')
    } catch (err) {
      setPicError(err?.message || 'Upload failed.')
    } finally {
      setPicBusy(false)
    }
  }

  const primary = () => {
    if (!requireAuth()) return
    if (mode === 'live') {
      onNavigate?.('live')
      return
    }
    if (mode === 'pic') {
      picRef.current?.click()
      return
    }
    onCreate?.(mode)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Create</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Pick a format, then upload — same flow as YouTube Studio / Twitch dashboard.
        </p>
      </div>

      <input ref={picRef} type="file" accept="image/*" className="hidden" onChange={onPickPic} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {MODES.map(({ id, label, hint, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              'text-left border p-4 transition-colors',
              mode === id
                ? 'border-white bg-white text-black'
                : 'border-zinc-800 bg-[#0c0c10] text-zinc-300 hover:border-zinc-600'
            )}
          >
            <Icon className={cn('h-5 w-5 mb-2', mode === id ? 'text-black' : 'text-white')} />
            <p className="text-sm font-semibold">{label}</p>
            <p className={cn('text-[11px] mt-0.5', mode === id ? 'text-zinc-700' : 'text-zinc-500')}>{hint}</p>
          </button>
        ))}
      </div>

      <div className="border border-zinc-800 bg-[#0c0c10] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {mode === 'video' && 'Upload a video'}
              {mode === 'clip' && 'Upload a clip'}
              {mode === 'pic' && 'Upload a pic'}
              {mode === 'live' && 'Start a live lobby'}
            </p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {mode === 'video' && 'Add title, description, category, and look filters before you publish.'}
              {mode === 'clip' && 'Vertical short · 60s max. You’ll pick filters on the next step.'}
              {mode === 'pic' && 'Opens your photo picker and posts straight to Pics.'}
              {mode === 'live' && 'Opens Live. Stream ingest is separate from this upload desk.'}
            </p>
            {picError ? <p className="mt-2 text-sm text-red-400">{picError}</p> : null}
          </div>
          <button
            type="button"
            onClick={primary}
            disabled={mode === 'pic' && picBusy}
            className="h-11 px-6 inline-flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold disabled:opacity-50 shrink-0"
          >
            <Upload className="h-4 w-4" />
            {mode === 'pic' && picBusy
              ? 'Uploading…'
              : mode === 'live'
                ? 'Open Live'
                : mode === 'pic'
                  ? 'Choose photo'
                  : 'Select files'}
          </button>
        </div>
      </div>
    </div>
  )
}
