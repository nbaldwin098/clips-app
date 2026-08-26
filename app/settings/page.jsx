import SpaShell from '../SpaShell'

export const metadata = {
  title: 'Settings',
  description: 'Account settings on calabi.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/settings' },
}

export default function SettingsRoute() {
  return <SpaShell />
}
