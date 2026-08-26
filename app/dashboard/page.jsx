import SpaShell from '../SpaShell'

export const metadata = {
  title: 'Creator Studio',
  description: 'Creator Studio on calabi.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/dashboard' },
}

export default function DashboardRoute() {
  return <SpaShell />
}
