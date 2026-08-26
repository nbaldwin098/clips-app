/**
 * Smoke: audience network map + immutable first-publish stamps.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const map = readFileSync('src/components/studio/InteractionBubbleMap.jsx', 'utf8')
const interactions = readFileSync('src/lib/creatorInteractions.js', 'utf8')
const mediaMeta = readFileSync('src/lib/mediaMeta.js', 'utf8')
const contentSync = readFileSync('src/lib/contentSync.js', 'utf8')
const studio = readFileSync('src/components/studio/CreatorStudio.jsx', 'utf8')
const profiles = readFileSync('src/lib/profiles.js', 'utf8')
const scripts = readFileSync('src/data/supabaseScripts.js', 'utf8')

assert.equal(existsSync('supabase/migrations/0015_videos_first_published_at.sql'), true)
assert.match(mediaMeta, /stampFirstPublished/)
assert.match(mediaMeta, /firstPublishedAt/)
assert.match(contentSync, /first_published_at/)
assert.match(contentSync, /videos_preserve_posted_times|first_published_at/)
assert.match(interactions, /buildInteractionNetwork/)
assert.match(interactions, /source !== 'tally'/)
assert.match(map, /Drag to pan/)
assert.match(map, /stroke="#ffffff"/)
assert.match(map, /fetchProfilesByIds/)
assert.match(map, /Audience network/)
assert.match(studio, /buildInteractionNetwork/)
assert.match(studio, /postedAtOf\(post\)/)
assert.match(profiles, /fetchProfilesByIds/)
assert.match(scripts, /0015_videos_first_published_at/)

console.log('bubble-map-insights-smoke: ok')
