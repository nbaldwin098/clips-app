/**
 * Helpers for in-browser CapCut/OBS-style Creator Lab (canvas + MediaRecorder).
 */

export const ASPECTS = [
  { id: '16:9', label: 'Landscape 16:9', w: 1280, h: 720 },
  { id: '9:16', label: 'Vertical 9:16', w: 720, h: 1280 },
  { id: '1:1', label: 'Square 1:1', w: 720, h: 720 },
]

export const LIVE_LAYOUTS = [
  { id: 'cam', label: 'Camera' },
  { id: 'screen', label: 'Screen' },
  { id: 'pip', label: 'Screen + cam PiP' },
  { id: 'side', label: 'Side by side' },
]

export function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t
    } catch {
      /* ignore */
    }
  }
  return ''
}

export function downloadBlob(blob, filename) {
  if (!blob || typeof document === 'undefined') return { ok: false, error: 'Nothing to download.' }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return { ok: true }
}

export function coverDraw(ctx, media, dx, dy, dw, dh) {
  if (!media) return
  const mw = media.videoWidth || media.naturalWidth || media.width || 0
  const mh = media.videoHeight || media.naturalHeight || media.height || 0
  if (!mw || !mh || !dw || !dh) {
    try {
      ctx.drawImage(media, dx, dy, dw, dh)
    } catch {
      /* not ready */
    }
    return
  }
  const scale = Math.max(dw / mw, dh / mh)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (mw - sw) / 2
  const sy = (mh - sh) / 2
  try {
    ctx.drawImage(media, sx, sy, sw, sh, dx, dy, dw, dh)
  } catch {
    /* decode race */
  }
}

export function containDraw(ctx, media, dx, dy, dw, dh) {
  if (!media) return
  const mw = media.videoWidth || media.naturalWidth || media.width || 0
  const mh = media.videoHeight || media.naturalHeight || media.height || 0
  if (!mw || !mh) {
    coverDraw(ctx, media, dx, dy, dw, dh)
    return
  }
  const scale = Math.min(dw / mw, dh / mh)
  const tw = mw * scale
  const th = mh * scale
  const tx = dx + (dw - tw) / 2
  const ty = dy + (dh - th) / 2
  try {
    ctx.drawImage(media, tx, ty, tw, th)
  } catch {
    /* ignore */
  }
}

export function stopStream(stream) {
  try {
    stream?.getTracks?.().forEach((t) => t.stop())
  } catch {
    /* ignore */
  }
}
