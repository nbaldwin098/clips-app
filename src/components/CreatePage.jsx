import { useRef, useState } from 'react'
import { Clapperboard, Film, Image as ImageIcon, Radio, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { publishPhoto } from '../lib/picsService'
import { uploadImageToSupabase, uploadVideoToSupabase, resolveUploadHost } from '../lib/mediaUpload'
import { cn } from '../lib/utils'
import { lsGet } from '../lib/storage'

const MODES = [
  { id: 'video', label: 'Video', hint: 'Long-form · up to 24h', Icon: Film },
  { id: 'clip', label: 'Clip', hint: 'Vertical · max 60s', Icon: Clapperboard },
  { id: 'pic', label: 'Pic', hint: 'Photo + optional gif/video/live', Icon: ImageIcon },
  { id: 'live', label: 'Go live', hint: 'Calabi Studio Live', Icon: Radio },
  { id: 'lab', label: 'Calabi Studio', hint: 'Edit · Live · Socials', Icon: Clapperboard },
]

export default function CreatePage({ onCreate, onOpenAuth, onNavigate }) {
  const { isAuthenticated, user } = useAuth()
  const picRef = useRef(null)
  const attachRef = useRef(null)
  const [picBusy, setPicBusy] = useState(false)
  const [picError, setPicError] = useState('')
  const [mode, setMode] = useState('video')
  const [picFile, setPicFile] = useState(null)
  const [attachFile, setAttachFile] = useState(null)
  const [attachLive, setAttachLive] = useState(false)
  const [picPreview, setPicPreview] = useState('')

  const requireAuth = () => {
    if (isAuthenticated) return true
    onOpenAuth?.()
    return false
  }

  const myLive = (() => {
    if (!user?.id) return null
    return (lsGet('live_board', []) || []).find((b) => b.isLive && b.userId === user.id) || null
  })()

  const onPickPicFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPicFile(file)
    setPicPreview(URL.createObjectURL(file))
    setPicError('')
  }

  const onPickAttach = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAttachFile(file)
    setAttachLive(false)
  }

  const publishPic = async () => {
    if (!requireAuth()) return
    if (!picFile) {
      setPicError('Choose a photo first.')
      return
    }
    setPicBusy(true)
    setPicError('')
    try {
      const attachments = []
      if (attachLive && myLive) {
        attachments.push({
          type: 'live',
          contentId: myLive.userId,
          title: myLive.title || 'Live',
          url: '',
        })
      } else if (attachFile) {
        const host = await resolveUploadHost(user)
        if (!host?.id) {
          setPicError('Cloud sign-in required to attach media.')
          return
        }
        const isGif = attachFile.type === 'image/gif' || /\.gif$/i.test(attachFile.name)
        if (String(attachFile.type).startsWith('video/') || isGif) {
          if (isGif && !String(attachFile.type).startsWith('video/')) {
            const up = await uploadImageToSupabase(attachFile, host.id)
            if (!up.ok) {
              setPicError(up.error || 'Attach upload failed.')
              return
            }
            attachments.push({ type: 'gif', url: up.publicUrl, title: attachFile.name })
          } else {
            const up = await uploadVideoToSupabase(attachFile, host.id)
            if (!up.ok) {
              setPicError(up.error || 'Attach upload failed.')
              return
            }
            attachments.push({ type: isGif ? 'gif' : 'video', url: up.publicUrl, title: attachFile.name })
          }
        } else if (String(attachFile.type).startsWith('image/')) {
          const up = await uploadImageToSupabase(attachFile, host.id)
          if (!up.ok) {
            setPicError(up.error || 'Attach upload failed.')
            return
          }
          attachments.push({ type: 'gif', url: up.publicUrl, title: attachFile.name })
        }
      }

      const res = await publishPhoto(picFile, user, { attachments })
      if (!res.ok) {
        setPicError(res.error || 'Upload failed.')
        return
      }
      setPicFile(null)
      setAttachFile(null)
      setAttachLive(false)
      if (picPreview) URL.revokeObjectURL(picPreview)
      setPicPreview('')
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
      onNavigate?.('calabi-studio', 'live')
      return
    }
    if (mode === 'lab') {
      onNavigate?.('calabi-studio')
      return
    }
    if (mode === 'pic') {
      if (picFile) publishPic()
      else picRef.current?.click()
      return
    }
    onCreate?.(mode)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Create</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Pick a format, then upload — go live from here into Calabi Studio.
        </p>
      </div>

      <input ref={picRef} type="file" accept="image/*" className="hidden" onChange={onPickPicFile} />
      <input ref={attachRef} type="file" accept="image/gif,video/*,.gif,video/mp4,video/webm" className="hidden" onChange={onPickAttach} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
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
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="flex-1 min-w-0 space-y-3">
            <p className="text-sm font-semibold text-white">
              {mode === 'video' && 'Upload a video'}
              {mode === 'clip' && 'Upload a clip'}
              {mode === 'pic' && 'Upload a pic'}
              {mode === 'live' && 'Go live in Calabi Studio'}
              {mode === 'lab' && 'Open Calabi Studio'}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {mode === 'video' && 'Add title, description, category, and hashtags before you publish.'}
              {mode === 'clip' && 'Vertical short · 60s max. Add hashtags on the next step.'}
              {mode === 'pic' && 'Photo is required. Optionally attach a gif, video, or your live lobby onto the pic.'}
              {mode === 'live' && 'Opens Calabi Studio → Live mixer. The Live tab is for watching streams only.'}
              {mode === 'lab' && 'Edit, Live mixer, and Socials in one place.'}
            </p>

            {mode === 'pic' ? (
              <div className="space-y-2 pt-1">
                {picPreview ? (
                  <img src={picPreview} alt="" className="h-28 w-28 object-cover border border-zinc-800" />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => picRef.current?.click()} className="h-8 px-3 border border-zinc-700 text-[11px] text-zinc-300">
                    {picFile ? 'Change photo' : 'Choose photo'}
                  </button>
                  <button type="button" onClick={() => attachRef.current?.click()} className="h-8 px-3 border border-zinc-700 text-[11px] text-zinc-300">
                    {attachFile ? `Attached: ${attachFile.name.slice(0, 18)}` : 'Attach gif / video'}
                  </button>
                  {myLive ? (
                    <button
                      type="button"
                      onClick={() => { setAttachLive((v) => !v); if (!attachLive) setAttachFile(null) }}
                      className={cn('h-8 px-3 border text-[11px]', attachLive ? 'border-red-500 text-red-300' : 'border-zinc-700 text-zinc-300')}
                    >
                      {attachLive ? 'Live attached ✓' : 'Attach my live'}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {picError ? <p className="text-sm text-red-400">{picError}</p> : null}
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
                ? 'Open Live studio'
                : mode === 'lab'
                  ? 'Open Studio'
                  : mode === 'pic'
                    ? (picFile ? 'Publish pic' : 'Choose photo')
                    : 'Select files'}
          </button>
        </div>
      </div>
    </div>
  )
}
