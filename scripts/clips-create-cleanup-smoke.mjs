/**
 * Smoke: clips open fix, no taste picker, avatars not banners, create filters.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shorts = readFileSync('src/components/ShortsFeed.jsx', 'utf8')
const home = readFileSync('src/components/HomeFeed.jsx', 'utf8')
const profile = readFileSync('src/components/ProfilePage.jsx', 'utf8')
const channel = readFileSync('src/components/ChannelPage.jsx', 'utf8')
const account = readFileSync('src/components/settings/AccountSettings.jsx', 'utf8')
const create = readFileSync('src/components/CreatePage.jsx', 'utf8')
const upload = readFileSync('src/components/UploadModal.jsx', 'utf8')
const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/index.css', 'utf8')
const taste = readFileSync('src/lib/tasteOnboarding.js', 'utf8')

assert.match(shorts, /typeof itemOrId === 'string' \? itemOrId : itemOrId\?\.id/)
assert.doesNotMatch(shorts, /onNavigate\?\.\('clips', \{ id \}\)/)
assert.match(app, /typeof rawId === 'object'/)
assert.match(css, /scrollbar-gutter:\s*stable/)
assert.doesNotMatch(home, /TastePicker/)
assert.match(taste, /return true/)
assert.doesNotMatch(profile, /bannerUrl|Change banner/)
assert.doesNotMatch(channel, /Change banner/)
assert.doesNotMatch(account, /Change banner|bannerDraft/)
assert.match(profile, /ChannelAvatar/)
assert.match(create, /Pick a format/)
assert.match(upload, /Look filters/)
assert.match(upload, /STREAM_FILTERS/)
assert.match(upload, /Category/)
assert.match(upload, /LIVE_CATEGORIES/)

console.log('clips-create-cleanup-smoke: ok')
