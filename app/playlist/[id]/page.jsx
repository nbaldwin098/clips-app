import SpaShell from '../../SpaShell'

export async function generateMetadata({ params }) {
  const { id } = await params
  const label = decodeURIComponent(String(id || 'playlist'))
  return {
    title: 'Playlist',
    description: 'Playlist on calabi.',
    robots: { index: false, follow: false },
    alternates: { canonical: `/playlist/${encodeURIComponent(label)}` },
  }
}

export default function PlaylistRoute() {
  return <SpaShell />
}
