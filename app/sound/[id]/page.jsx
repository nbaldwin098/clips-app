import SpaShell from '../../SpaShell'

export async function generateMetadata({ params }) {
  const { id } = await params
  const label = decodeURIComponent(String(id || 'sound'))
  return {
    title: label,
    description: `Posts using ${label} on calabi.`,
    alternates: { canonical: `/sound/${encodeURIComponent(label)}` },
  }
}

export default function SoundRoute() {
  return <SpaShell />
}
