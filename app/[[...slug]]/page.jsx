import SpaShell from '../SpaShell'

export const metadata = {
  title: 'calabi',
  description: 'Watch on calabi.',
  robots: { index: false, follow: false },
}

/**
 * Last-resort shell for unknown / legacy paths.
 * All known app surfaces have dedicated `app/<route>/page.jsx` entries.
 */
export default function SpaCatchAll() {
  return <SpaShell />
}
