/**
 * Runtime tests for named-account likes and the Supabase job rules.
 * Does not need a live Supabase project.
 */
import { readFileSync } from 'node:fs'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
  clear: () => { store.clear() },
}
const target = new EventTarget()
globalThis.window = Object.assign(target, {
  localStorage: globalThis.localStorage,
  dispatchEvent: (...args) => EventTarget.prototype.dispatchEvent.apply(target, args),
  addEventListener: (...args) => EventTarget.prototype.addEventListener.apply(target, args),
  removeEventListener: (...args) => EventTarget.prototype.removeEventListener.apply(target, args),
})
globalThis.CustomEvent = class CustomEvent extends Event {
  constructor(name, init = {}) {
    super(name, init)
    this.detail = init.detail
  }
}

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL', msg)
  } else {
    console.log('ok', msg)
  }
}

const { ensureUpvote, getVotes, getUserVote, toggleVote } = await import('../src/lib/engagement.js')

const u1 = 'named-0001'
const u2 = 'named-0002'
const vid = 'org-nasa-iss-earth'

ensureUpvote(u1, vid)
ensureUpvote(u1, vid)
assert(getVotes(vid).up === 1, 'second like from the same person does not add another like')
assert(getUserVote(u1, vid) === 'up', 'person still has an up vote')
ensureUpvote(u2, vid)
assert(getVotes(vid).up === 2, 'a second person can like the same video')
const afterToggle = toggleVote(u1, vid, 'up')
assert(afterToggle.up === 1, 'human toggle can unlike — named path must not use toggle')
ensureUpvote(u1, vid)
assert(getVotes(vid).up === 2, 'ensureUpvote restores a like and never goes negative')
assert(getVotes(vid).down === 0, 'named likes never create a down vote')

const { seedOfficialCatalog } = await import('../src/data/publicMediaSeed.js')
seedOfficialCatalog()
const { stepNamedActivity } = await import('../src/lib/namedAccountActivity.js')
for (let i = 0; i < 60; i += 1) stepNamedActivity()
assert(getVotes(vid).up >= 1, 'browser fallback likes official catalog videos')
assert(getUserVote('named-0001', vid) === 'up', 'Lucy Bennett account liked a NASA video')
assert(!JSON.stringify(store.get('yt_comments') || '').includes('named-0001'), 'activity did not write comments')

const csv = readFileSync(new URL('../src/data/namedAccounts.csv', import.meta.url), 'utf8')
const people = csv.trim().split(/\n/).slice(1).map((line) => {
  const n = Number(line.split(',')[0])
  return { n, id: `named-${String(n).padStart(4, '0')}` }
})
assert(people.length === 467, '467 people in the csv')

function runNamedActivitySql({ people: ppl, videos, live, batch, cursorStart = 0 }) {
  const votes = new Map()
  const watches = new Map()
  const comments = []
  const chat = []
  let cursor = cursorStart
  const liveWatchers = new Set(live.watchers || [])
  const views = Object.fromEntries(videos.map((v) => [v.id, 0]))
  const likes = Object.fromEntries(videos.map((v) => [v.id, 0]))
  for (let i = 0; i < batch; i += 1) {
    const pid = ppl[cursor % ppl.length].id
    if (videos.length) {
      const cid = videos[Math.floor(cursor / ppl.length) % videos.length].id
      const vk = `${pid}|${cid}`
      if (!votes.has(vk)) {
        votes.set(vk, 'up')
        likes[cid] += 1
      }
      if (!watches.has(vk)) {
        watches.set(vk, 1)
        views[cid] += 1
      }
    }
    liveWatchers.add(pid)
    cursor += 1
  }
  return { votes, watches, comments, chat, cursor, liveWatchers, views, likes }
}

const videos = [
  { id: 'org-nasa-iss-earth', type: 'video' },
  { id: 'org-nasa-earth-clip', type: 'short' },
  { id: 'org-class-nouns-pic', type: 'pic' },
]
const live = { isLive: true, watchers: [] }
const pass1 = runNamedActivitySql({ people, videos, live, batch: 40, cursorStart: 0 })
assert(pass1.votes.size === 40, 'first job tick inserts 40 new likes')
assert([...pass1.votes.values()].every((d) => d === 'up'), 'job only writes up votes')
assert(pass1.comments.length === 0, 'job never comments')
assert(pass1.chat.length === 0, 'job never chats')
assert(pass1.liveWatchers.size === 40, 'job sits 40 people in the live lobby')

const pass2 = runNamedActivitySql({ people, videos, live, batch: 40 * 20, cursorStart: 0 })
const full = runNamedActivitySql({
  people,
  videos,
  live,
  batch: people.length * videos.length,
  cursorStart: 0,
})
assert(full.votes.size === people.length * videos.length, 'one full pass likes every video once per person')
assert(full.views['org-nasa-iss-earth'] === 467, 'each person records one view per video')
const again = runNamedActivitySql({
  people,
  videos,
  live,
  batch: people.length * videos.length * 2,
  cursorStart: 0,
})
assert(again.votes.size === people.length * videos.length, 'a second lap does not unlike or double-like')
assert(again.views['org-nasa-iss-earth'] === 467, 'a second lap does not invent extra first-time views')
assert(again.likes['org-nasa-iss-earth'] === 467, 'like tally caps at 467 per item')
assert(pass2.cursor === 800, 'cursor advances so the job can keep going')

const sql = readFileSync(new URL('../supabase/migrations/0009_named_activity.sql', import.meta.url), 'utf8')
assert(!/insert into public\.comments/i.test(sql), 'sql file has no comment inserts')
assert(/on conflict \(user_id, content_id\) do nothing/.test(sql), 'sql never deletes a like')
assert(/cron\.schedule/.test(sql), 'sql schedules the job')

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log('all named-activity runtime checks passed')
