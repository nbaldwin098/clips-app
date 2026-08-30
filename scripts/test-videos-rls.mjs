/**
 * BUG-048: videos + clips storage RLS after bucket recreate.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../supabase/migrations/0028_videos_rls_storage_audit.sql', import.meta.url), 'utf8')
const scripts = readFileSync(new URL('../src/data/supabaseScripts.js', import.meta.url), 'utf8')
const server = readFileSync(new URL('../src/lib/contentServer.js', import.meta.url), 'utf8')
const sync = readFileSync(new URL('../src/lib/contentSync.js', import.meta.url), 'utf8')

assert.match(sql, /is_platform_admin/)
assert.match(sql, /get_video_by_id/)
assert.match(sql, /with check \(auth\.uid\(\) = creator_id or public\.is_platform_admin\(\)\)/)
assert.match(sql, /coalesce\(visibility, 'public'\) = 'public'/)
assert.match(sql, /or public\.is_platform_admin\(\)/)
assert.match(sql, /insert into storage\.buckets/)
assert.match(sql, /on conflict \(id\) do update set public = true/)
assert.match(sql, /Public read access to clips bucket/)
assert.match(sql, /with check \(/)
assert.match(sql, /storage\.foldername\(name\)\)\[2\] = auth\.uid\(\)::text/)
assert.match(sql, /grant execute on function public\.get_video_by_id/)

assert.equal(sql.includes('visibility <> \'private\''), false, 'unlisted must not be listed to anon')
assert.equal(sql.includes('using (true)'), false, 'videos select is not open-to-all')

assert.match(scripts, /0028_videos_rls_storage_audit\.sql/)
assert.match(server, /get_video_by_id/)
assert.match(sync, /fetchContentRecordById/)
assert.match(sync, /get_video_by_id/)

console.log('ok videos RLS audit regression')
