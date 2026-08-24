/**
 * Wall-clock probe: bots must keep adding likes/views while time passes.
 */
import { readFileSync } from 'node:fs'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
}
const target = new EventTarget()
globalThis.window = Object.assign(target, {
  localStorage: globalThis.localStorage,
  dispatchEvent: (...a) => EventTarget.prototype.dispatchEvent.apply(target, a),
  addEventListener: (...a) => EventTarget.prototype.addEventListener.apply(target, a),
  removeEventListener: (...a) => EventTarget.prototype.removeEventListener.apply(target, a),
  setInterval: setInterval,
  clearInterval: clearInterval,
})
globalThis.CustomEvent = class CustomEvent extends Event {
  constructor(n, i = {}) { super(n, i); this.detail = i.detail }
}

function likesUp() {
  const raw = JSON.parse(store.get('engagement_likes') || '{}')
  return Object.values(raw).reduce((n, v) => n + (Number(v?.up) || 0), 0)
}
function views() {
  const raw = JSON.parse(store.get('engagement_views') || '{}')
  return Object.values(raw).reduce((n, v) => n + (Number(v) || 0), 0)
}
function watchers() {
  const board = JSON.parse(store.get('live_board') || '[]')
  return (board[0]?.watcherIds || []).length
}

const { seedOfficialCatalog } = await import('../src/data/publicMediaSeed.js')
seedOfficialCatalog()
store.set('live_board', JSON.stringify([{
  userId: 'org-nasa', isLive: true, title: 'Lobby test', handle: 'nasa',
  displayName: 'NASA', watcherIds: [], watchers: 0,
}]))

const { startNamedAccountActivity, stopNamedAccountActivity } = await import('../src/lib/namedAccountActivity.js')
const t0 = Date.now()
const likes0 = likesUp()
const views0 = views()
startNamedAccountActivity()

await new Promise((r) => setTimeout(r, 2500))
const likes1 = likesUp()
const views1 = views()
const watch1 = watchers()

await new Promise((r) => setTimeout(r, 2500))
const likes2 = likesUp()
const views2 = views()
const watch2 = watchers()
stopNamedAccountActivity()

const elapsed = Date.now() - t0
console.log(JSON.stringify({
  elapsedMs: elapsed,
  likes: [likes0, likes1, likes2],
  views: [views0, views1, views2],
  liveWatchers: [watch1, watch2],
  likesGrew: likes2 > likes1 && likes1 > likes0,
  viewsGrew: views2 > views1 && views1 > views0,
  liveGrew: watch2 >= watch1 && watch1 > 0,
}, null, 2))

if (!(likes2 > likes1 && likes1 > likes0)) {
  console.error('FAIL bots are not actively liking over time')
  process.exit(1)
}
if (!(views2 > views1)) {
  console.error('FAIL bots are not actively watching over time')
  process.exit(1)
}
if (!(watch2 > 0)) {
  console.error('FAIL bots are not sitting in live')
  process.exit(1)
}
const comments = store.get('yt_comments') || ''
if (/named-0/.test(comments)) {
  console.error('FAIL bots commented')
  process.exit(1)
}
console.log('ok bots are actively working in this process')
