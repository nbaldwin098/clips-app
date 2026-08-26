import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Clapperboard,
  Download,
  Film,
  ImagePlus,
  Monitor,
  Pause,
  Play,
  Radio,
  Square,
  Type,
  Upload,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { STREAM_FILTERS, filterCss } from '../../lib/streamFilters'
import {
  ASPECTS,
  LIVE_LAYOUTS,
  applyCssFilter,
  containDraw,
  coverDraw,
  downloadBlob,
  pickRecorderMime,
  stopStream,
} from '../../lib/creatorLabMedia'
import { cn } from '../../lib/utils'

function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0)
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

function AspectPreview({ aspectId, children, className }) {
  const a = ASPECTS.find((x) => x.id === aspectId) || ASPECTS[0]
  const ratio = a.w / a.h
  return (
    <div
      className={cn('relative mx-auto w-full max-w-full bg-black overflow-hidden', className)}
      style={{ aspectRatio: `${ratio}` }}
    >
      {children}
    </div>
  )
}

/**
 * CapCut-like editor: import → scrub/trim → text + filter → export WebM from canvas.
 */
function EditLab({ onOpenCreate }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const imgRef = useRef(null)
  const fileRef = useRef(null)
  const rafRef = useRef(0)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const [mediaKind, setMediaKind] = useState(null) // 'video' | 'image'
  const [mediaUrl, setMediaUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [trimIn, setTrimIn] = useState(0)
  const [trimOut, setTrimOut] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [aspectId, setAspectId] = useState('9:16')
  const [filterId, setFilterId] = useState('none')
  const [text, setText] = useState('')
  const [textSize, setTextSize] = useState(42)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [exportUrl, setExportUrl] = useState('')

  const aspect = ASPECTS.find((a) => a.id === aspectId) || ASPECTS[0]
  const css = filterCss(filterId)

  const clearMedia = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (mediaUrl) URL.revokeObjectURL(mediaUrl)
    setMediaUrl('')
    setMediaKind(null)
    setDuration(0)
    setCurrent(0)
    setTrimIn(0)
    setTrimOut(0)
    setPlaying(false)
    setExportUrl((u) => {
      if (u) URL.revokeObjectURL(u)
      return ''
    })
  }, [mediaUrl])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    if (mediaUrl) URL.revokeObjectURL(mediaUrl)
    if (exportUrl) URL.revokeObjectURL(exportUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = aspect
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)

    const drawMedia = () => {
      if (mediaKind === 'video' && videoRef.current) {
        containDraw(ctx, videoRef.current, 0, 0, w, h)
      } else if (mediaKind === 'image' && imgRef.current?.complete) {
        containDraw(ctx, imgRef.current, 0, 0, w, h)
      }
    }
    applyCssFilter(ctx, css, w, h, drawMedia)

    if (text.trim()) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      const pad = 16
      ctx.font = `bold ${textSize}px system-ui, sans-serif`
      const metrics = ctx.measureText(text.trim())
      const tw = metrics.width + pad * 2
      const th = textSize + pad
      const tx = (w - tw) / 2
      const ty = h * 0.78
      ctx.fillRect(tx, ty, tw, th)
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text.trim(), w / 2, ty + th / 2)
    }
  }, [aspect, css, mediaKind, text, textSize])

  useEffect(() => {
    paint()
  }, [paint, mediaUrl, current])

  useEffect(() => {
    if (!playing || mediaKind !== 'video') return undefined
    const tick = () => {
      const v = videoRef.current
      if (!v) return
      setCurrent(v.currentTime)
      if (v.currentTime >= (trimOut || duration)) {
        v.pause()
        v.currentTime = trimIn
        setPlaying(false)
        setCurrent(trimIn)
      }
      paint()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, mediaKind, trimIn, trimOut, duration, paint])

  const onPick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    clearMedia()
    const url = URL.createObjectURL(file)
    if (file.type.startsWith('image/')) {
      setMediaKind('image')
      setMediaUrl(url)
      setNote(`Loaded ${file.name}`)
      return
    }
    if (file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name)) {
      setMediaKind('video')
      setMediaUrl(url)
      setNote(`Loaded ${file.name}`)
      return
    }
    URL.revokeObjectURL(url)
    setNote('Pick a video or image file.')
  }

  const onVideoMeta = () => {
    const v = videoRef.current
    if (!v) return
    const d = Number.isFinite(v.duration) ? v.duration : 0
    setDuration(d)
    setTrimIn(0)
    setTrimOut(d)
    setCurrent(0)
    paint()
  }

  const togglePlay = async () => {
    const v = videoRef.current
    if (!v || mediaKind !== 'video') return
    if (playing) {
      v.pause()
      setPlaying(false)
      return
    }
    if (v.currentTime < trimIn || v.currentTime >= trimOut) v.currentTime = trimIn
    try {
      await v.play()
      setPlaying(true)
    } catch {
      setNote('Playback blocked — click again after interacting with the page.')
    }
  }

  const scrub = (t) => {
    const v = videoRef.current
    const next = Math.min(Math.max(Number(t), trimIn), trimOut || duration)
    if (v) v.currentTime = next
    setCurrent(next)
    paint()
  }

  const exportClip = async () => {
    if (!mediaKind) {
      setNote('Import media first.')
      return
    }
    const canvas = canvasRef.current
    if (!canvas || typeof MediaRecorder === 'undefined') {
      setNote('Export needs MediaRecorder (Chrome/Edge/Firefox).')
      return
    }
    setBusy(true)
    setNote('Exporting…')
    setExportUrl((u) => {
      if (u) URL.revokeObjectURL(u)
      return ''
    })

    try {
      paint()
      const mime = pickRecorderMime()
      const stream = canvas.captureStream(30)
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      recorderRef.current = rec
      rec.ondataavailable = (ev) => {
        if (ev.data?.size) chunksRef.current.push(ev.data)
      }

      const done = new Promise((resolve, reject) => {
        rec.onstop = () => resolve()
        rec.onerror = () => reject(new Error('Recorder failed'))
      })

      rec.start(200)

      if (mediaKind === 'image') {
        // Hold still frame ~1.2s so social apps accept a short clip
        await new Promise((r) => setTimeout(r, 1200))
        paint()
      } else {
        const v = videoRef.current
        if (!v) throw new Error('No video')
        v.pause()
        setPlaying(false)
        v.currentTime = trimIn
        await new Promise((r) => {
          const onSeek = () => {
            v.removeEventListener('seeked', onSeek)
            r()
          }
          v.addEventListener('seeked', onSeek)
        })
        await v.play()
        const end = trimOut || duration
        await new Promise((resolve) => {
          const loop = () => {
            paint()
            if (v.currentTime >= end - 0.04 || v.ended || v.paused) {
              v.pause()
              resolve()
              return
            }
            rafRef.current = requestAnimationFrame(loop)
          }
          rafRef.current = requestAnimationFrame(loop)
        })
      }

      if (rec.state !== 'inactive') rec.stop()
      await done
      stream.getTracks().forEach((t) => t.stop())

      const blob = new Blob(chunksRef.current, { type: mime || 'video/webm' })
      if (!blob.size) throw new Error('Empty export')
      const url = URL.createObjectURL(blob)
      setExportUrl(url)
      downloadBlob(blob, `calabi-edit-${Date.now()}.webm`)
      setNote(`Exported ${(blob.size / 1024 / 1024).toFixed(1)} MB WebM — upload from Create when ready.`)
    } catch (err) {
      setNote(err?.message || 'Export failed.')
    } finally {
      setBusy(false)
      recorderRef.current = null
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <AspectPreview aspectId={aspectId} className="border border-zinc-800 max-h-[70vh]">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />
          {!mediaKind ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center pointer-events-none">
              <Film className="h-10 w-10 text-zinc-600" />
              <p className="text-sm text-zinc-400">Import a clip or photo to start editing</p>
            </div>
          ) : null}
        </AspectPreview>

        {mediaKind === 'video' ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="hidden"
            playsInline
            preload="auto"
            onLoadedMetadata={onVideoMeta}
            muted={false}
          />
        ) : null}
        {mediaKind === 'image' ? (
          <img ref={imgRef} src={mediaUrl} alt="" className="hidden" onLoad={paint} />
        ) : null}

        {mediaKind === 'video' && duration > 0 ? (
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-[#0c0c10] p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="h-9 w-9 inline-flex items-center justify-center bg-white text-black"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <span className="text-xs text-zinc-400 tabular-nums w-24">
                {fmtTime(current)} / {fmtTime(duration)}
              </span>
              <input
                type="range"
                min={trimIn}
                max={trimOut || duration}
                step={0.05}
                value={Math.min(Math.max(current, trimIn), trimOut || duration)}
                onChange={(e) => scrub(e.target.value)}
                className="flex-1 accent-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-zinc-500">
                In
                <input
                  type="number"
                  min={0}
                  max={trimOut}
                  step={0.1}
                  value={Number(trimIn.toFixed(1))}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value) || 0)
                    setTrimIn(Math.min(v, trimOut))
                    scrub(Math.min(v, trimOut))
                  }}
                  className="mt-1 w-full h-9 border border-zinc-800 bg-black px-2 text-sm text-white"
                />
              </label>
              <label className="text-[11px] text-zinc-500">
                Out
                <input
                  type="number"
                  min={trimIn}
                  max={duration}
                  step={0.1}
                  value={Number(trimOut.toFixed(1))}
                  onChange={(e) => {
                    const v = Math.min(duration, Number(e.target.value) || duration)
                    setTrimOut(Math.max(v, trimIn))
                  }}
                  className="mt-1 w-full h-9 border border-zinc-800 bg-black px-2 text-sm text-white"
                />
              </label>
            </div>
            <div className="h-2 rounded bg-zinc-900 relative overflow-hidden">
              <div
                className="absolute inset-y-0 bg-zinc-600"
                style={{
                  left: `${duration ? (trimIn / duration) * 100 : 0}%`,
                  width: `${duration ? ((trimOut - trimIn) / duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept="video/*,image/*" className="hidden" onChange={onPick} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-10 inline-flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold"
          >
            <Upload className="h-4 w-4" /> Import media
          </button>
          {mediaKind ? (
            <button
              type="button"
              onClick={clearMedia}
              className="w-full h-9 text-xs text-zinc-400 border border-zinc-800 hover:text-white"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Aspect</p>
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspectId(a.id)}
                className={cn(
                  'h-8 px-2.5 text-[11px] font-semibold border',
                  aspectId === a.id ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-300'
                )}
              >
                {a.id}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Filter</p>
          <div className="flex flex-wrap gap-1.5">
            {STREAM_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterId(f.id)}
                className={cn(
                  'h-8 px-2.5 text-[11px] border',
                  filterId === f.id ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1">
            <Type className="h-3 w-3" /> Text overlay
          </span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 80))}
            placeholder="Title / hook"
            className="mt-1 w-full h-10 border border-zinc-800 bg-black px-3 text-sm text-white"
          />
          <input
            type="range"
            min={24}
            max={72}
            value={textSize}
            onChange={(e) => setTextSize(Number(e.target.value))}
            className="mt-2 w-full accent-white"
          />
        </label>

        <button
          type="button"
          disabled={busy || !mediaKind}
          onClick={exportClip}
          className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#eb0400] text-white text-sm font-semibold disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          {busy ? 'Exporting…' : 'Export WebM'}
        </button>
        {exportUrl ? (
          <a href={exportUrl} download className="block text-center text-xs text-zinc-400 underline">
            Download again
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenCreate?.()}
          className="w-full h-9 text-xs text-zinc-300 border border-zinc-700 hover:border-zinc-500"
        >
          Open Create to upload export
        </button>
        {note ? <p className="text-xs text-amber-400/90 leading-relaxed">{note}</p> : null}
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Runs in your browser like CapCut Mobile lite — trim, filter, caption, export. Cloud encode / timeline multi-track ships later.
        </p>
      </div>
    </div>
  )
}

/**
 * OBS-like live mixer: camera + screen + layouts → canvas → local record / go live lobby.
 */
function LiveLab({ onNavigate }) {
  const canvasRef = useRef(null)
  const camVideoRef = useRef(null)
  const screenVideoRef = useRef(null)
  const overlayImgRef = useRef(null)
  const overlayFileRef = useRef(null)
  const rafRef = useRef(0)
  const camStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const [layout, setLayout] = useState('pip')
  const [aspectId, setAspectId] = useState('16:9')
  const [filterId, setFilterId] = useState('none')
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [overlayUrl, setOverlayUrl] = useState('')
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [recUrl, setRecUrl] = useState('')
  const [note, setNote] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef(0)

  const aspect = ASPECTS.find((a) => a.id === aspectId) || ASPECTS[0]
  const css = filterCss(filterId)

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = aspect
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    ctx.fillStyle = '#0a0a0c'
    ctx.fillRect(0, 0, w, h)

    const cam = camVideoRef.current
    const scr = screenVideoRef.current
    const camReady = camOn && cam && cam.readyState >= 2
    const scrReady = screenOn && scr && scr.readyState >= 2

    const drawScene = () => {
      if (layout === 'cam' && camReady) {
        coverDraw(ctx, cam, 0, 0, w, h)
      } else if (layout === 'screen' && scrReady) {
        containDraw(ctx, scr, 0, 0, w, h)
      } else if (layout === 'side') {
        const half = w / 2
        if (scrReady) coverDraw(ctx, scr, 0, 0, half, h)
        else {
          ctx.fillStyle = '#121218'
          ctx.fillRect(0, 0, half, h)
        }
        if (camReady) coverDraw(ctx, cam, half, 0, half, h)
        else {
          ctx.fillStyle = '#18181f'
          ctx.fillRect(half, 0, half, h)
        }
      } else {
        // pip — screen main, cam corner
        if (scrReady) containDraw(ctx, scr, 0, 0, w, h)
        else if (camReady) coverDraw(ctx, cam, 0, 0, w, h)
        else {
          ctx.fillStyle = '#121218'
          ctx.fillRect(0, 0, w, h)
        }
        if (camReady && (scrReady || layout === 'pip')) {
          const pw = Math.round(w * 0.22)
          const ph = Math.round(h * 0.22)
          const px = w - pw - 16
          const py = h - ph - 16
          ctx.fillStyle = '#000'
          ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4)
          coverDraw(ctx, cam, px, py, pw, ph)
        }
      }
    }

    applyCssFilter(ctx, css, w, h, drawScene)

    if (overlayUrl && overlayImgRef.current?.complete) {
      const img = overlayImgRef.current
      const iw = Math.min(w * 0.28, img.naturalWidth || 160)
      const ih = iw * ((img.naturalHeight || 1) / (img.naturalWidth || 1))
      ctx.drawImage(img, 16, 16, iw, ih)
    }

    if (text.trim()) {
      ctx.font = 'bold 28px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      const pad = 12
      const tw = ctx.measureText(text.trim()).width + pad * 2
      ctx.fillRect(16, h - 56, tw, 40)
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'middle'
      ctx.fillText(text.trim(), 16 + pad, h - 36)
    }

    if (!camOn && !screenOn) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = '16px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Add camera and/or screen — mix like OBS on calabi', w / 2, h / 2)
      ctx.textAlign = 'left'
    }
  }, [aspect, camOn, screenOn, layout, css, overlayUrl, text])

  useEffect(() => {
    let alive = true
    const loop = () => {
      if (!alive) return
      paint()
      if (recording && startedAtRef.current) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [paint, recording])

  useEffect(() => () => {
    stopStream(camStreamRef.current)
    stopStream(screenStreamRef.current)
    if (overlayUrl) URL.revokeObjectURL(overlayUrl)
    if (recUrl) URL.revokeObjectURL(recUrl)
    try {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    } catch {
      /* ignore */
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startCam = async () => {
    setNote('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setNote('Camera not supported in this browser.')
      return
    }
    try {
      stopStream(camStreamRef.current)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      camStreamRef.current = stream
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = stream
        await camVideoRef.current.play().catch(() => {})
      }
      setCamOn(true)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setCamOn(false)
        camStreamRef.current = null
      })
    } catch (err) {
      setNote(err?.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Could not open camera.')
    }
  }

  const stopCam = () => {
    stopStream(camStreamRef.current)
    camStreamRef.current = null
    if (camVideoRef.current) camVideoRef.current.srcObject = null
    setCamOn(false)
  }

  const startScreen = async () => {
    setNote('')
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setNote('Screen share not supported here.')
      return
    }
    try {
      stopStream(screenStreamRef.current)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      })
      screenStreamRef.current = stream
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream
        await screenVideoRef.current.play().catch(() => {})
      }
      setScreenOn(true)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setScreenOn(false)
        screenStreamRef.current = null
      })
    } catch (err) {
      setNote(err?.name === 'NotAllowedError' ? 'Screen share denied.' : 'Could not share screen.')
    }
  }

  const stopScreen = () => {
    stopStream(screenStreamRef.current)
    screenStreamRef.current = null
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null
    setScreenOn(false)
  }

  const onOverlay = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (overlayUrl) URL.revokeObjectURL(overlayUrl)
    setOverlayUrl(URL.createObjectURL(file))
  }

  const startRec = () => {
    const canvas = canvasRef.current
    if (!canvas || typeof MediaRecorder === 'undefined') {
      setNote('Recording needs MediaRecorder.')
      return
    }
    if (!camOn && !screenOn) {
      setNote('Turn on camera or screen first.')
      return
    }
    setRecUrl((u) => {
      if (u) URL.revokeObjectURL(u)
      return ''
    })
    const mime = pickRecorderMime()
    const canvasStream = canvas.captureStream(30)
    // Mix first available audio track
    const audio =
      camStreamRef.current?.getAudioTracks?.()?.[0] ||
      screenStreamRef.current?.getAudioTracks?.()?.[0]
    if (audio) canvasStream.addTrack(audio)
    const rec = new MediaRecorder(canvasStream, mime ? { mimeType: mime } : undefined)
    chunksRef.current = []
    rec.ondataavailable = (ev) => {
      if (ev.data?.size) chunksRef.current.push(ev.data)
    }
    rec.onstop = () => {
      canvasStream.getTracks().forEach((t) => {
        if (t.kind === 'video') t.stop()
      })
      const blob = new Blob(chunksRef.current, { type: mime || 'video/webm' })
      if (blob.size) {
        const url = URL.createObjectURL(blob)
        setRecUrl(url)
        downloadBlob(blob, `calabi-live-${Date.now()}.webm`)
        setNote(`Saved ${(blob.size / 1024 / 1024).toFixed(1)} MB recording.`)
      }
      setRecording(false)
    }
    recorderRef.current = rec
    startedAtRef.current = Date.now()
    setElapsed(0)
    rec.start(250)
    setRecording(true)
    setNote('Recording program output…')
  }

  const stopRec = () => {
    try {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    } catch {
      setRecording(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-3">
        <div className="relative">
          <AspectPreview aspectId={aspectId} className="border border-zinc-800 max-h-[70vh]">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />
            {recording ? (
              <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                <span className="px-2 py-1 bg-[#eb0400] text-white text-[10px] font-bold uppercase tracking-wider">
                  Rec {fmtTime(elapsed)}
                </span>
              </div>
            ) : null}
          </AspectPreview>
        </div>
        <video ref={camVideoRef} className="hidden" playsInline muted autoPlay />
        <video ref={screenVideoRef} className="hidden" playsInline muted autoPlay />
        {overlayUrl ? <img ref={overlayImgRef} src={overlayUrl} alt="" className="hidden" /> : null}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Sources</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={camOn ? stopCam : startCam}
              className={cn(
                'h-10 inline-flex items-center justify-center gap-1.5 text-xs font-semibold border',
                camOn ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-200'
              )}
            >
              <Camera className="h-3.5 w-3.5" /> {camOn ? 'Cam on' : 'Camera'}
            </button>
            <button
              type="button"
              onClick={screenOn ? stopScreen : startScreen}
              className={cn(
                'h-10 inline-flex items-center justify-center gap-1.5 text-xs font-semibold border',
                screenOn ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-200'
              )}
            >
              <Monitor className="h-3.5 w-3.5" /> {screenOn ? 'Screen on' : 'Screen'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Layout</p>
          <div className="flex flex-wrap gap-1.5">
            {LIVE_LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLayout(l.id)}
                className={cn(
                  'h-8 px-2.5 text-[11px] border',
                  layout === l.id ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-300'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Canvas</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspectId(a.id)}
                className={cn(
                  'h-8 px-2.5 text-[11px] font-semibold border',
                  aspectId === a.id ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-300'
                )}
              >
                {a.id}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STREAM_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterId(f.id)}
                className={cn(
                  'h-8 px-2 text-[10px] border',
                  filterId === f.id ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-400'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] text-zinc-500">Lower-third text</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 60))}
            className="mt-1 w-full h-9 border border-zinc-800 bg-black px-3 text-sm text-white"
            placeholder="LIVE · your title"
          />
        </label>

        <input ref={overlayFileRef} type="file" accept="image/*" className="hidden" onChange={onOverlay} />
        <button
          type="button"
          onClick={() => overlayFileRef.current?.click()}
          className="w-full h-9 inline-flex items-center justify-center gap-1.5 text-xs border border-zinc-700 text-zinc-300"
        >
          <ImagePlus className="h-3.5 w-3.5" /> Logo / overlay
        </button>
        {overlayUrl ? (
          <button type="button" onClick={() => { URL.revokeObjectURL(overlayUrl); setOverlayUrl('') }} className="text-[11px] text-zinc-500 underline">
            Remove overlay
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {!recording ? (
            <button
              type="button"
              onClick={startRec}
              className="h-10 inline-flex items-center justify-center gap-1.5 bg-[#eb0400] text-white text-xs font-semibold"
            >
              <Radio className="h-3.5 w-3.5" /> Record
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRec}
              className="h-10 inline-flex items-center justify-center gap-1.5 bg-white text-black text-xs font-semibold"
            >
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate?.('live')}
            className="h-10 inline-flex items-center justify-center gap-1.5 border border-zinc-600 text-xs font-semibold text-white"
          >
            Go live lobby
          </button>
        </div>
        {recUrl ? (
          <a href={recUrl} download className="block text-center text-xs text-zinc-400 underline">
            Download recording again
          </a>
        ) : null}
        {note ? <p className="text-xs text-amber-400/90 leading-relaxed">{note}</p> : null}
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Program output mixes on this page (OBS-style). Viewers on Live still need cloud ingest for a remote picture — until then, record here or share this browser window into the Live lobby.
        </p>
      </div>
    </div>
  )
}

/**
 * In-site CapCut + OBS creator tool for calabi users.
 */
export default function CreatorLab({ onNavigate, initialMode = 'edit', compact = false }) {
  const { isAuthenticated } = useAuth()
  const [mode, setMode] = useState(initialMode === 'live' ? 'live' : 'edit')

  if (!isAuthenticated) {
    return (
      <div className={cn('p-6', compact ? '' : 'max-w-3xl mx-auto')}>
        <h1 className="text-xl font-semibold text-white">Creator Lab</h1>
        <p className="text-sm text-zinc-400 mt-2">Sign in to edit clips and mix live sources on calabi.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-5', compact ? 'p-3 sm:p-4' : 'p-4 md:p-6 max-w-6xl mx-auto')}>
      {!compact ? (
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Clapperboard className="h-6 w-6" /> Creator Lab
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            CapCut-style edit and OBS-style live mixer — in your browser on calabi.
          </p>
        </div>
      ) : null}

      <div className="inline-flex border border-zinc-800 p-0.5 bg-[#0c0c10]">
        <button
          type="button"
          onClick={() => setMode('edit')}
          className={cn(
            'h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5',
            mode === 'edit' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          )}
        >
          <Film className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          type="button"
          onClick={() => setMode('live')}
          className={cn(
            'h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5',
            mode === 'live' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
          )}
        >
          <Radio className="h-3.5 w-3.5" /> Live studio
        </button>
      </div>

      {mode === 'edit' ? (
        <EditLab onOpenCreate={() => onNavigate?.('create')} />
      ) : (
        <LiveLab onNavigate={onNavigate} />
      )}
    </div>
  )
}
