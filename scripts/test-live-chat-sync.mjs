/**
 * BUG-023: live chat channel keys, message dedupe, and shared subscribe hub.
 */
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
}

const timers = new Set()
globalThis.window = {
  setInterval(fn, ms) {
    const id = setInterval(fn, ms)
    timers.add(id)
    return id
  },
  clearInterval(id) {
    timers.delete(id)
    clearInterval(id)
  },
  addEventListener() {},
  removeEventListener() {},
}
globalThis.document = {
  visibilityState: 'visible',
  addEventListener() {},
  removeEventListener() {},
}

const {
  GLOBAL_LIVE_CHANNEL_ID,
  GLOBAL_LIVE_ROOM,
  isGlobalLiveChannel,
  resolveLiveChatChannelId,
  dedupeLiveChatMessages,
  subscribeLiveChat,
  pushLiveChatMessage,
  readLocalLiveChat,
} = await import('../src/lib/liveChatSync.js')

assert.equal(isGlobalLiveChannel(''), true)
assert.equal(isGlobalLiveChannel('lobby'), true)
assert.equal(isGlobalLiveChannel('  Lobby  '), true)
assert.equal(isGlobalLiveChannel(GLOBAL_LIVE_CHANNEL_ID), true)
assert.equal(isGlobalLiveChannel('__clips_global__'), true)
assert.equal(isGlobalLiveChannel('global'), true)
assert.equal(isGlobalLiveChannel(GLOBAL_LIVE_ROOM), true)
assert.equal(isGlobalLiveChannel('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), false)

assert.equal(resolveLiveChatChannelId('lobby'), GLOBAL_LIVE_CHANNEL_ID)
assert.equal(resolveLiveChatChannelId('  __calabi_global__ '), GLOBAL_LIVE_CHANNEL_ID)
assert.equal(resolveLiveChatChannelId('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')

const duped = dedupeLiveChatMessages([
  { id: 'm1', text: 'hi' },
  { id: 'm1', text: 'hi again' },
  { id: 'm2', text: 'yo' },
  { id: null, text: 'drop' },
])
assert.deepEqual(duped.map((m) => m.id), ['m1', 'm2'])

pushLiveChatMessage('lobby', { id: 'shared_1', userId: 'u1', handle: 'a', text: 'hello' })
assert.equal(readLocalLiveChat(GLOBAL_LIVE_CHANNEL_ID).some((m) => m.id === 'shared_1'), true)
assert.equal(readLocalLiveChat('lobby').some((m) => m.id === 'shared_1'), true)

const hitsA = []
const hitsB = []
const offA = subscribeLiveChat('lobby', (list) => { hitsA.push(list) })
const offB = subscribeLiveChat('__calabi_global__', (list) => { hitsB.push(list) })

pushLiveChatMessage(GLOBAL_LIVE_ROOM, { id: 'shared_2', userId: 'u2', handle: 'b', text: 'two' })
offA()
pushLiveChatMessage('lobby', { id: 'shared_3', userId: 'u3', handle: 'c', text: 'three' })
offB()

assert.ok(hitsA.length >= 1, 'first subscriber received lobby cache')
assert.ok(hitsB.length >= 1, 'second subscriber shares the same channel key')
assert.ok(
  hitsA.some((list) => list.some((m) => m.id === 'shared_1')),
  'normalized lobby key reads the same cache',
)

for (const id of timers) clearInterval(id)

console.log('ok live chat sync regression')
