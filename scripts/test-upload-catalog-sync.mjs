/**
 * Regression: catalog upsert columns must match migration 0012 or uploads fail
 * after storage succeeds (user sees "Couldn't upload").
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const syncSrc = readFileSync('src/lib/contentSync.js', 'utf8')
const migSql = readFileSync('supabase/migrations/0012_videos_publish_columns.sql', 'utf8')
const contentSrc = readFileSync('src/lib/contentService.js', 'utf8')
const picsSrc = readFileSync('src/lib/picsService.js', 'utf8')
const mediaSrc = readFileSync('src/lib/mediaUpload.js', 'utf8')

const catalogCols = ['published_at', 'status', 'scheduled_for', 'price_usd']
for (const col of catalogCols) {
  assert.match(migSql, new RegExp(col), `0012 migration adds ${col}`)
  assert.match(syncSrc, new RegExp(col.replace('_', '_')), `toRow() sends ${col}`)
}

assert.match(syncSrc, /return \{ ok: true, error: null \}/, 'pushContentRecord returns ok object')
assert.match(syncSrc, /return \{ ok: false, error:/, 'pushContentRecord returns error object')
assert.match(contentSrc, /pushed\.error/, 'video publish surfaces catalog errors')
assert.match(picsSrc, /pushed\.error/, 'photo publish surfaces catalog errors')
assert.match(mediaSrc, /uploadHostRequiredMessage/, 'host resolution has a clear message')
assert.match(contentSrc, /uploadHostRequiredMessage/, 'video publish uses host message')
assert.match(picsSrc, /uploadHostRequiredMessage/, 'photo publish uses host message')

console.log('ok upload catalog sync regression')
