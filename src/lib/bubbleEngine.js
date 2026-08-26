/**
 * Shared bubble layout + scale engine.
 * - Lays out inside the viewport with padding (fits the box at zoom 1).
 * - Aggregates millions of people into a visible LOD set (top N + “more” cluster).
 * - Pan/zoom clamps so the graph never slides out of the frame.
 */

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

/** Hard visual cap — SVG/DOM cannot render millions of nodes. */
export const BUBBLE_VISUAL_CAP = 240

export function formatCompactCount(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`
  return String(v)
}

/**
 * Reduce an arbitrary population (including millions) to a drawable set.
 * Keeps the heaviest nodes; rolls the rest into one cluster bubble.
 * `totalHint` lets callers pass a cloud total larger than the loaded sample.
 */
export function prepareBubblePopulation(people = [], { cap = BUBBLE_VISUAL_CAP, totalHint = null } = {}) {
  const list = Array.isArray(people) ? people : []
  const sample = list.length
  const total = Math.max(sample, Number(totalHint) || 0)
  if (sample === 0 && total === 0) {
    return {
      nodes: [],
      total: 0,
      hidden: 0,
      shown: 0,
      aggregated: false,
      populationLabel: '0',
    }
  }

  if (sample <= cap && total <= cap) {
    return {
      nodes: list,
      total: total || sample,
      hidden: 0,
      shown: sample,
      aggregated: false,
      populationLabel: formatCompactCount(total || sample),
    }
  }

  const sorted = [...list].sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0))
  const keep = Math.max(1, Math.min(cap - 1, sorted.length))
  const top = sorted.slice(0, keep)
  const rest = sorted.slice(keep)
  const byType = {}
  let weight = 0
  let eventCount = 0
  for (const p of rest) {
    weight += Number(p.weight) || 1
    eventCount += Number(p.eventCount) || 0
    for (const [k, v] of Object.entries(p.byType || {})) {
      byType[k] = (byType[k] || 0) + (Number(v) || 0)
    }
  }
  const hiddenCount = Math.max(rest.length, total - top.length)
  if (!rest.length && total > sample) {
    weight = Math.max(1, total - sample)
    eventCount = weight
  }
  const cluster = {
    id: 'agg_others',
    kind: 'cluster',
    displayName: `${formatCompactCount(hiddenCount)} more`,
    handle: '',
    actorId: null,
    weight: Math.max(1, weight || hiddenCount),
    eventCount: eventCount || hiddenCount,
    byType,
    types: Object.keys(byType),
    primaryType: Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'view',
    primaryLabel: 'Aggregated for scale',
    color: '#71717a',
    short: 'More',
    isCluster: true,
    clusterSize: hiddenCount,
  }

  return {
    nodes: [...top, cluster],
    total: total || sample,
    hidden: hiddenCount,
    shown: top.length,
    aggregated: true,
    populationLabel: formatCompactCount(total || sample),
  }
}

/**
 * Spiral layout that stays inside the box (padding for rings + labels).
 * Returns { hub, nodes, world } — same shape the studio map already expects.
 */
export function layoutBubbleNetwork(people, width, height, { pad = 56 } = {}) {
  const w = Math.max(160, width)
  const h = Math.max(160, height)
  const cx = w / 2
  const cy = h / 2
  const usable = Math.max(48, Math.min(w, h) / 2 - pad)
  const hubR = Math.min(30, Math.max(18, usable * 0.14))
  const maxR = Math.max(36, usable - hubR - 8)
  const n = Math.max(people.length, 1)

  const placed = people.map((p, i) => {
    const t = i + 1
    const ring = 0.22 + 0.78 * Math.sqrt(t / n)
    const angle = i * GOLDEN
    const radius = Math.min(maxR, hubR + 28 + ring * (maxR - hubR))
    const base = p.isCluster || p.kind === 'cluster'
      ? Math.min(40, 22 + Math.log10((p.clusterSize || p.weight || 1) + 1) * 8)
      : Math.min(36, Math.max(14, 12 + Math.sqrt(p.weight || 1) * 4.5))
    // Keep node disk fully inside the usable circle.
    const size = Math.min(base, Math.max(12, (usable - (radius - hubR)) * 0.9))
    return {
      ...p,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      size: Math.max(12, size),
    }
  })

  return {
    hub: { id: 'hub', x: cx, y: cy, size: hubR * 2 },
    nodes: placed,
    world: { w, h, pad, usable },
  }
}

/** Alias used by site map / older call sites. */
export function layoutNetwork(people, width, height, opts) {
  return layoutBubbleNetwork(people, width, height, opts)
}

export function contentBounds(laid) {
  if (!laid?.hub) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }
  let minX = laid.hub.x - (laid.hub.size || 40) / 2
  let maxX = laid.hub.x + (laid.hub.size || 40) / 2
  let minY = laid.hub.y - (laid.hub.size || 40) / 2
  let maxY = laid.hub.y + (laid.hub.size || 40) / 2
  for (const n of laid.nodes || []) {
    const r = (n.size || 16) / 2 + 18 // rings + label
    minX = Math.min(minX, n.x - r)
    maxX = Math.max(maxX, n.x + r)
    minY = Math.min(minY, n.y - r)
    maxY = Math.max(maxY, n.y + r)
  }
  return { minX, maxX, minY, maxY }
}

/** Zoom floor = entire graph still fills inside the viewport. */
export function fitZoomForBounds(bounds, width, height, { pad = 12 } = {}) {
  const bw = Math.max(1, bounds.maxX - bounds.minX)
  const bh = Math.max(1, bounds.maxY - bounds.minY)
  const zx = (width - pad * 2) / bw
  const zy = (height - pad * 2) / bh
  const z = Math.min(zx, zy, 1)
  return Math.max(0.35, Number.isFinite(z) ? z : 1)
}

export function clampBubbleZoom(z, fitZoom = 0.35, maxZoom = 24) {
  if (!Number.isFinite(z) || z <= 0) return 1
  return Math.min(maxZoom, Math.max(fitZoom, z))
}

/**
 * Keep transformed content near the viewport.
 * Always allows drag slack — even when content fits — so users can pan freely.
 */
export function clampPanToBox(pan, zoom, size, bounds) {
  const edgePad = 10
  const freeSlack = Math.max(48, Math.min(size.w, size.h) * 0.35)
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const contentW = (bounds.maxX - bounds.minX) * zoom
  const contentH = (bounds.maxY - bounds.minY) * zoom
  let { x, y } = pan

  {
    const minX = size.w - edgePad - bounds.maxX * zoom
    const maxX = edgePad - bounds.minX * zoom
    if (minX <= maxX) {
      x = Math.min(maxX, Math.max(minX, x))
    } else {
      const mid = size.w / 2 - cx * zoom
      x = Math.min(mid + freeSlack, Math.max(mid - freeSlack, x))
    }
  }

  {
    const minY = size.h - edgePad - bounds.maxY * zoom
    const maxY = edgePad - bounds.minY * zoom
    if (minY <= maxY) {
      y = Math.min(maxY, Math.max(minY, y))
    } else {
      const mid = size.h / 2 - cy * zoom
      y = Math.min(mid + freeSlack, Math.max(mid - freeSlack, y))
    }
  }

  return { x, y }
}

export function centeredPan(size, bounds, zoom) {
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  return {
    x: size.w / 2 - cx * zoom,
    y: size.h / 2 - cy * zoom,
  }
}
