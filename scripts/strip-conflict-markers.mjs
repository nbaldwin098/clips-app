/**
 * Last-resort strip of unresolved git conflict markers (keeps the first side).
 * Runs before `next build` so a Cursor merge cannot ship a broken bundle.
 * Mentions of markers in docs/comments must not fail the build.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const BLOCK =
  /^<<<<<<<[^\n]*\n([\s\S]*?)^=======\n[\s\S]*?^>>>>>>>[^\n]*\n/gm

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(jsx?|tsx?|mjs|css|md|json)$/.test(f))

let found = 0
let failed = 0
for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (!text.includes('<<<<<<<')) continue

  const cleaned = text.replace(BLOCK, '$1')
  if (cleaned !== text) {
    writeFileSync(file, cleaned)
    found += 1
    console.warn(`stripped conflict markers in ${file} (kept first side)`)
    text = cleaned
  }

  // Real leftover block in source = fail. Docs that only mention the token = warn.
  if (/^<<<<<<< /m.test(text)) {
    if (/\.(jsx?|tsx?|mjs|css|json)$/.test(file)) {
      console.error(`unresolved conflict markers remain in ${file}`)
      failed += 1
    } else {
      console.warn(`conflict token mentioned in ${file} (not a source block; ignored)`)
    }
  }
}

if (failed) process.exit(1)
if (found) console.warn(`strip-conflict-markers: cleaned ${found} file(s)`)
else console.log('strip-conflict-markers: clean')
