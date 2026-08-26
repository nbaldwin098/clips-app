import SpaShell from '../SpaShell'

export const metadata = {
  title: 'Library',
  description: 'Your library on calabi.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/library' },
}

export default function LibraryRoute() {
  return <SpaShell />
}
