import SpaShell from '../../SpaShell'

export async function generateMetadata({ params }) {
  const { section } = await params
  const label = decodeURIComponent(String(section || 'settings'))
  return {
    title: 'Settings',
    description: 'Account settings on calabi.',
    robots: { index: false, follow: false },
    alternates: { canonical: `/settings/${encodeURIComponent(label)}` },
  }
}

export default function SettingsSectionRoute() {
  return <SpaShell />
}
