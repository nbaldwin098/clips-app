import { lsGet, lsSet } from './storage'
import { loadTaste, saveTaste } from './algorithmEngine'

const KEY = 'clips_topics_picked'

/** Media topics only — not personal identity. Seeds Recommended. */
export const MEDIA_TOPICS = [
  'Music', 'Gaming', 'Sports', 'Comedy', 'Film', 'Art', 'Nature', 'Tech', 'Food', 'Education',
]

export function hasPickedTopics() {
  return lsGet(KEY, false) === true
}

export function seedTopicAffinity(userId, topics) {
  const id = userId || 'anon'
  const taste = loadTaste(id)
  for (const t of topics || []) {
    const tag = String(t || '').trim()
    if (!tag) continue
    taste.tagAffinity[tag] = (taste.tagAffinity[tag] || 0) + 0.85
  }
  saveTaste(id, taste)
  lsSet(KEY, true)
}

export function skipTopicPicker() {
  lsSet(KEY, true)
}
