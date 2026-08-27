import SpaShell from '../SpaShell'

export const metadata = {
  title: 'calabi',
  description: 'Watch on calabi.',
  robots: { index: false, follow: false },
}

/**
 * Last-resort shell for unknown / legacy paths.
 * Required catch-all (`[...slug]`) — not optional — so it does not conflict with `app/page.jsx` at `/`.
 * All known app surfaces have dedicated `app/<route>/page.jsx` entries.
 */
export default function SpaCatchAll() {
  return <SpaShell />
}
