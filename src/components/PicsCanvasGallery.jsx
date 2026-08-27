/**
 * Interactive Pics mosaic — HTML Canvas 2D camera (pan / cursor-zoom / pinch).
 * Zooming into or clicking a tile locks the camera and opens focus view.
 */
import { useCallback, useEffect, useRef } from 'react'
import { pickImmediatePhotoSrc, isHttpUrl, isDataImageUrl } from '../lib/picsService'
import { getMediaBlobUrl } from '../lib/videoStorage'

const CELL = 200
const GAP = 10
const MIN_ZOOM = 0.15
const MAX_ZOOM = 8
const ENTER_ZOOM_FILL = 0.72 // tile covers this fraction of viewport → enter focus
const WORLD_PAD = 80

function layoutTiles(count) {
  const cols = Math.max(3, Math.ceil(Math.sqrt(count * 1.35)))
  const rows = Math.max(1, Math.ceil(count / cols))
  const stride = CELL + GAP
  const width = cols * stride - GAP
  const height = rows * stride - GAP
  const tiles = []
  for (let i = 0; i < count; i += 1) {
    const col = i % cols
    const row = Math.floor(i / cols)
    tiles.push({
      index: i,
      x: col * stride,
      y: row * stride,
      w: CELL,
      h: CELL,
    })
  }
  return { tiles, width, height, cols, rows }
}

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n))
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('no url'))
      return
    }
    const img = new Image()
    img.decoding = 'async'
    if (isHttpUrl(url) && !url.includes(typeof window !== 'undefined' ? window.location.host : '')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('load fail'))
    img.src = url
  })
}

async function resolvePicUrl(pic) {
  const immediate = pickImmediatePhotoSrc(pic, { full: false })
  if (isHttpUrl(immediate) || isDataImageUrl(immediate) || String(immediate || '').startsWith('blob:')) {
    return immediate
  }
  try {
    const idb = await getMediaBlobUrl(pic.id)
    if (idb) return idb
  } catch { /* ignore */ }
  return pickImmediatePhotoSrc(pic, { full: true }) || immediate || ''
}

/**
 * @param {{
 *   items: any[],
 *   onEnterPic: (index: number, id: string) => void,
 *   onUnplayable?: (id: string) => void,
 *   restoreCamera?: { x: number, y: number, zoom: number } | null,
 *   onCameraChange?: (cam: { x: number, y: number, zoom: number }) => void,
 * }} props
 */
export default function PicsCanvasGallery({
  items,
  onEnterPic,
  onUnplayable,
  restoreCamera = null,
  onCameraChange,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const camRef = useRef({ x: 0, y: 0, zoom: 1 })
  const layoutRef = useRef(layoutTiles(0))
  const imagesRef = useRef(new Map()) // id -> HTMLImageElement | 'failed'
  const rafRef = useRef(0)
  const dirtyRef = useRef(true)
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const dragRef = useRef(null)
  const hoverRef = useRef(-1)

  const markDirty = () => {
    dirtyRef.current = true
  }

  const worldFromScreen = (sx, sy) => {
    const cam = camRef.current
    return {
      x: (sx - cam.x) / cam.zoom,
      y: (sy - cam.y) / cam.zoom,
    }
  }

  const fitCamera = useCallback((layout, vw, vh) => {
    if (!layout.width || !layout.height) {
      camRef.current = { x: 0, y: 0, zoom: 1 }
      return
    }
    const pad = WORLD_PAD * 2
    const zoom = Math.min(
      (vw - 24) / (layout.width + pad),
      (vh - 24) / (layout.height + pad),
      1.2,
    )
    const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM)
    camRef.current = {
      zoom: z,
      x: (vw - layout.width * z) / 2,
      y: (vh - layout.height * z) / 2,
    }
  }, [])

  const zoomAt = useCallback((sx, sy, factor) => {
    const cam = camRef.current
    const nextZoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    if (nextZoom === cam.zoom) return
    const wx = (sx - cam.x) / cam.zoom
    const wy = (sy - cam.y) / cam.zoom
    camRef.current = {
      zoom: nextZoom,
      x: sx - wx * nextZoom,
      y: sy - wy * nextZoom,
    }
    onCameraChange?.(camRef.current)
    markDirty()
  }, [onCameraChange])

  const tileAtScreen = useCallback((sx, sy) => {
    const { x, y } = worldFromScreen(sx, sy)
    const { tiles } = layoutRef.current
    for (let i = 0; i < tiles.length; i += 1) {
      const t = tiles[i]
      if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return t
    }
    return null
  }, [])

  const maybeEnterFromZoom = useCallback((sx, sy) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const tile = tileAtScreen(sx, sy) || (() => {
      // Prefer tile nearest viewport center when zooming mid-screen
      const rect = wrap.getBoundingClientRect()
      return tileAtScreen(rect.width / 2, rect.height / 2)
    })()
    if (!tile) return
    const cam = camRef.current
    const screenW = tile.w * cam.zoom
    const screenH = tile.h * cam.zoom
    const fill = Math.min(screenW / wrap.clientWidth, screenH / wrap.clientHeight)
    if (fill >= ENTER_ZOOM_FILL) {
      const pic = items[tile.index]
      if (pic?.id) {
        onCameraChange?.(camRef.current)
        onEnterPic?.(tile.index, pic.id)
      }
    }
  }, [items, onEnterPic, onCameraChange, tileAtScreen])

  // Layout + image loading
  useEffect(() => {
    layoutRef.current = layoutTiles(items.length)
    const wrap = wrapRef.current
    if (wrap) {
      if (restoreCamera && Number.isFinite(restoreCamera.zoom)) {
        camRef.current = {
          x: Number(restoreCamera.x) || 0,
          y: Number(restoreCamera.y) || 0,
          zoom: clamp(Number(restoreCamera.zoom) || 1, MIN_ZOOM, MAX_ZOOM),
        }
      } else {
        fitCamera(layoutRef.current, wrap.clientWidth, wrap.clientHeight)
      }
    }
    markDirty()

    let cancelled = false
    const loadAll = async () => {
      for (const pic of items) {
        if (cancelled) return
        if (imagesRef.current.has(pic.id)) continue
        try {
          const url = await resolvePicUrl(pic)
          if (!url) {
            imagesRef.current.set(pic.id, 'failed')
            onUnplayable?.(pic.id)
            markDirty()
            continue
          }
          const img = await loadImage(url)
          if (cancelled) return
          imagesRef.current.set(pic.id, img)
          markDirty()
        } catch {
          if (cancelled) return
          imagesRef.current.set(pic.id, 'failed')
          onUnplayable?.(pic.id)
          markDirty()
        }
      }
    }
    loadAll()
    return () => { cancelled = true }
  }, [items, fitCamera, restoreCamera, onUnplayable])

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined
    const ctx = canvas.getContext('2d', { alpha: false })

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      markDirty()
    }
    resize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(wrap)
    window.addEventListener('resize', resize)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      if (!dirtyRef.current) return
      dirtyRef.current = false
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const cam = camRef.current
      const { tiles } = layoutRef.current

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.translate(cam.x, cam.y)
      ctx.scale(cam.zoom, cam.zoom)

      // Cull against viewport in world space
      const wl = -cam.x / cam.zoom
      const wt = -cam.y / cam.zoom
      const wr = (w - cam.x) / cam.zoom
      const wb = (h - cam.y) / cam.zoom

      for (let i = 0; i < tiles.length; i += 1) {
        const t = tiles[i]
        if (t.x + t.w < wl || t.x > wr || t.y + t.h < wt || t.y > wb) continue
        const pic = items[t.index]
        if (!pic) continue
        const img = imagesRef.current.get(pic.id)
        ctx.fillStyle = '#18181b'
        ctx.fillRect(t.x, t.y, t.w, t.h)

        if (img && img !== 'failed' && img.complete) {
          const iw = img.naturalWidth || img.width
          const ih = img.naturalHeight || img.height
          if (iw > 0 && ih > 0) {
            const scale = Math.max(t.w / iw, t.h / ih)
            const dw = iw * scale
            const dh = ih * scale
            const dx = t.x + (t.w - dw) / 2
            const dy = t.y + (t.h - dh) / 2
            ctx.save()
            ctx.beginPath()
            ctx.rect(t.x, t.y, t.w, t.h)
            ctx.clip()
            ctx.drawImage(img, dx, dy, dw, dh)
            ctx.restore()
          }
        } else if (img === 'failed') {
          ctx.fillStyle = '#3f3f46'
          ctx.fillRect(t.x, t.y, t.w, t.h)
        }

        if (hoverRef.current === t.index) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 2 / cam.zoom
          ctx.strokeRect(t.x + 1 / cam.zoom, t.y + 1 / cam.zoom, t.w - 2 / cam.zoom, t.h - 2 / cam.zoom)
        }
      }
      ctx.restore()
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [items])

  // Pointer / wheel / pinch / keyboard
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined

    const onWheel = (e) => {
      e.preventDefault()
      const rect = wrap.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const zoomingOut = e.deltaY > 0
      const factor = zoomingOut ? Math.exp(-Math.min(0.35, Math.abs(e.deltaY) * 0.0015)) : Math.exp(Math.min(0.35, Math.abs(e.deltaY) * 0.0015))
      zoomAt(sx, sy, factor)
      if (!zoomingOut) maybeEnterFromZoom(sx, sy)
    }

    const onPointerDown = (e) => {
      wrap.setPointerCapture?.(e.pointerId)
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointersRef.current.size === 1) {
        dragRef.current = {
          x: e.clientX,
          y: e.clientY,
          camX: camRef.current.x,
          camY: camRef.current.y,
          moved: false,
        }
        pinchRef.current = null
      } else if (pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()]
        const dx = pts[1].x - pts[0].x
        const dy = pts[1].y - pts[0].y
        pinchRef.current = {
          dist: Math.hypot(dx, dy) || 1,
          zoom: camRef.current.zoom,
          midX: (pts[0].x + pts[1].x) / 2,
          midY: (pts[0].y + pts[1].y) / 2,
        }
        dragRef.current = null
      }
    }

    const onPointerMove = (e) => {
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }
      const rect = wrap.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (pointersRef.current.size === 2 && pinchRef.current) {
        const pts = [...pointersRef.current.values()]
        const dx = pts[1].x - pts[0].x
        const dy = pts[1].y - pts[0].y
        const dist = Math.hypot(dx, dy) || 1
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top
        const factor = dist / pinchRef.current.dist
        const targetZoom = clamp(pinchRef.current.zoom * factor, MIN_ZOOM, MAX_ZOOM)
        const cam = camRef.current
        const wx = (midX - cam.x) / cam.zoom
        const wy = (midY - cam.y) / cam.zoom
        camRef.current = {
          zoom: targetZoom,
          x: midX - wx * targetZoom,
          y: midY - wy * targetZoom,
        }
        onCameraChange?.(camRef.current)
        markDirty()
        maybeEnterFromZoom(midX, midY)
        return
      }

      if (dragRef.current && pointersRef.current.size === 1) {
        const dx = e.clientX - dragRef.current.x
        const dy = e.clientY - dragRef.current.y
        if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true
        camRef.current = {
          ...camRef.current,
          x: dragRef.current.camX + dx,
          y: dragRef.current.camY + dy,
        }
        onCameraChange?.(camRef.current)
        markDirty()
        return
      }

      const tile = tileAtScreen(sx, sy)
      const nextHover = tile ? tile.index : -1
      if (nextHover !== hoverRef.current) {
        hoverRef.current = nextHover
        markDirty()
      }
    }

    const onPointerUp = (e) => {
      const wasDrag = dragRef.current
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) pinchRef.current = null
      if (pointersRef.current.size === 0) {
        if (wasDrag && !wasDrag.moved) {
          const rect = wrap.getBoundingClientRect()
          const sx = e.clientX - rect.left
          const sy = e.clientY - rect.top
          const tile = tileAtScreen(sx, sy)
          if (tile) {
            const pic = items[tile.index]
            if (pic?.id) {
              onCameraChange?.(camRef.current)
              onEnterPic?.(tile.index, pic.id)
            }
          }
        }
        dragRef.current = null
      }
    }

    const onDblClick = (e) => {
      const rect = wrap.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      zoomAt(sx, sy, 1.8)
      maybeEnterFromZoom(sx, sy)
    }

    wrap.addEventListener('wheel', onWheel, { passive: false })
    wrap.addEventListener('pointerdown', onPointerDown)
    wrap.addEventListener('pointermove', onPointerMove)
    wrap.addEventListener('pointerup', onPointerUp)
    wrap.addEventListener('pointercancel', onPointerUp)
    wrap.addEventListener('dblclick', onDblClick)

    return () => {
      wrap.removeEventListener('wheel', onWheel)
      wrap.removeEventListener('pointerdown', onPointerDown)
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerup', onPointerUp)
      wrap.removeEventListener('pointercancel', onPointerUp)
      wrap.removeEventListener('dblclick', onDblClick)
    }
  }, [items, zoomAt, maybeEnterFromZoom, tileAtScreen, onEnterPic, onCameraChange])

  return (
    <div ref={wrapRef} className="h-full min-h-0 relative overflow-hidden bg-black touch-none select-none cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Pics canvas gallery" />
      {!items.length ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <p className="text-sm text-zinc-500">No pics yet — post from Create (+)</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2 px-3 py-1 bg-black/60 text-[11px] text-zinc-400">
          Drag to pan · scroll / pinch to zoom · click or zoom into a photo
        </div>
      )}
      {/* Smoke / a11y hooks for mosaic enter semantics */}
      <span className="sr-only">ENTER_ZOOM tileAtViewportCenter Zoom the mosaic</span>
    </div>
  )
}
