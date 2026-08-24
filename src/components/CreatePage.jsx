import { useRef, useState } from 'react'
import { Clapperboard, Film, Image as ImageIcon, Radio, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishPhoto } from '../lib/picsService'

const TILES = [
  {
    id: 'video',
    label: 'Video',
    hint: 'Upload a longer watch. This is the main feed.',
    Icon: Film,
  },
  {
    id: 'clip',
    label: 'Clip',
    hint: 'Upload a short vertical clip.',
    Icon: Clapperboard,
  },
  {
    id: 'pic',
    label: 'Pic',
    hint: 'Upload a photo to Pics.',
    Icon: ImageIcon,
  },
  {
    id: 'live',
    label: 'Go live',
    hint: 'Open the live lobby. Ingest is how the picture goes out.',
    Icon: Radio,
  },
]

export default function CreatePage({ onCreate, onOpenAuth, onNavigate }) {
  const { isAuthenticated, user } = useAuth()
  const picRef = useRef(null)
  const [picBusy, setPicBusy] = useState(false)
  const [picError, setPicError] = useState('')

  const run = (id) => {
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    if (id === 'pic') {
      picRef.current?.click()
      return
    }
    onCreate?.(id)
  }

  const onPickPic = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    setPicBusy(true)
    setPicError('')
    try {
      const res = await publishPhoto(file, user)
      if (!res.ok) {
        setPicError(res.error || 'Upload failed.')
        return
      }
      onNavigate?.('pics')
    } catch (err) {
      setPicError(err?.message || 'Upload failed.')
    } finally {
      setPicBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-start gap-3 mb-8">
        <span className="h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Create</h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-xl">
            Upload video, clips, and pics, or go live from here. Editing tools land on this page — this is the desk, not a header button.
          </p>
        </div>
      </div>

      <input ref={picRef} type="file" accept="image/*" className="hidden" onChange={onPickPic} />

      {picError ? <p className="mb-4 text-sm text-red-400">{picError}</p> : null}

      <div className="grid sm:grid-cols-2 gap-3">
        {TILES.map(({ id, label, hint, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => run(id)}
            disabled={id === 'pic' && picBusy}
            className="text-left rounded-2xl border border-[#2a2a32] bg-[#101014] hover:border-white/25 hover:bg-[#16161c] p-5 transition-colors disabled:opacity-60"
          >
            <Icon className="h-6 w-6 text-white mb-3" />
            <p className="text-base font-semibold text-white">{id === 'pic' && picBusy ? 'Uploading…' : label}</p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{hint}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
