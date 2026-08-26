import SpaShell from '../../SpaShell'

export async function generateMetadata({ params }) {
  const { id } = await params
  const label = decodeURIComponent(String(id || 'tag')).replace(/^#/, '')
  return {
    title: `#${label}`,
    description: `Posts tagged #${label} on calabi.`,
    alternates: { canonical: `/tag/${encodeURIComponent(label)}` },
  }
}

export default function TagRoute() {
  return <SpaShell />
}
