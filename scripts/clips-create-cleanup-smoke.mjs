/**
 * Smoke: clips open fix, no taste picker, avatars not banners, create hashtags.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const shorts = readFileSync('src/components/ShortsFeed.jsx', 'utf8')
const home = readFileSync('src/components/HomeFeed.jsx', 'utf8')
const profile = readFileSync('src/components/ProfilePage.jsx', 'utf8')
const channel = readFileSync('src/components/ChannelPage.jsx', 'utf8')
const account = readFileSync('src/components/settings/AccountSettings.jsx', 'utf8')
const create = readFileSync('src/components/CreatePage.jsx', 'utf8')
const upload = readFileSync('src/components/UploadModal.jsx', 'utf8')
const app = readFileSync('src/App.jsx', 'utf8')
const css = readFileSync('src/index.css', 'utf8')
const lab = readFileSync('src/components/studio/CreatorLab.jsx', 'utf8')

assert.match(shorts, /typeof itemOrId === 'string' \? itemOrId : itemOrId\?\.id/)
assert.doesNotMatch(shorts, /onNavigate\?\.\('clips', \{ id \}\)/)
assert.match(app, /typeof rawId === 'object'/)
assert.match(css, /scrollbar-gutter:\s*stable/)
assert.doesNotMatch(home, /TastePicker/)
assert.equal(existsSync('src/components/TastePicker.jsx'), false)
assert.equal(existsSync('src/lib/aiAvatar.js'), false)
assert.doesNotMatch(profile, /bannerUrl|Change banner/)
assert.doesNotMatch(channel, /Change banner/)
assert.doesNotMatch(account, /Change banner|bannerDraft/)
assert.match(profile, /ChannelAvatar/)
assert.match(create, /Pick a format/)
assert.doesNotMatch(upload, /Look filters/)
assert.doesNotMatch(upload, /STREAM_FILTERS/)
assert.match(upload, /HashtagInput|Hashtags/)
assert.match(upload, /Category/)
assert.match(upload, /LIVE_CATEGORIES/)
assert.match(lab, /StudioSocialsPanel/)
assert.doesNotMatch(lab, /STREAM_FILTERS/)
assert.doesNotMatch(lab, /aiAvatar|AI avatar/)

console.log('clips-create-cleanup-smoke: ok')
