/**
 * Last-resort strip of unresolved git conflict markers (keeps the first side).
 * Runs before `next build` so a Cursor merge cannot ship a broken bundle.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(jsx?|tsx?|mjs|css|md|json)$/.test(f))

let found = 0
for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (!text.includes('<<<<<<<')) continue
  found += 1
  const cleaned = text.replace(
    /^<<<<<<<[^\n]*\n([\s\S]*?)^=======\n[\s\S]*?^>>>>>>>[^\n]*\n/gm,
    '$1',
  )
  if (cleaned === text) {
    console.error(`conflict markers in ${file} but pattern did not match`)
    process.exit(1)
  }
  writeFileSync(file, cleaned)
  console.warn(`stripped conflict markers in ${file} (kept first side)`)
}

if (found) {
  console.warn(`strip-conflict-markers: cleaned ${found} file(s)`)
} else {
  console.log('strip-conflict-markers: clean')
}
