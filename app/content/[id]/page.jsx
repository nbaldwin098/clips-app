import { notFound } from 'next/navigation'
import { looksLikeContentId } from '@/lib/publicId.js'
import { fetchContentById } from '@/lib/contentServer.js'
import SpaShell from '../../SpaShell'

export async function generateMetadata({ params }) {
  const { id } = await params
  if (!looksLikeContentId(id)) {
    return { title: 'calabi' }
  }
  const item = await fetchContentById(id)
  if (!item) {
    return {
      title: 'Not found',
      description: 'This post is unavailable on calabi.',
    }
  }
  const title = item.title || 'Untitled'
  const description = (item.description || `Watch ${title} on calabi`).slice(0, 200)
  const image = item.thumbUrl || item.mediaUrl || ''
  return {
    title,
    description,
    alternates: { canonical: `/${id}` },
    openGraph: {
      title: `${title} · calabi`,
      description,
      url: `https://calabi.us/${id}`,
      type: item.type === 'pic' ? 'website' : 'video.other',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${title} · calabi`,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function ContentRoute({ params }) {
  const { id } = await params
  if (!looksLikeContentId(id)) notFound()
  return <SpaShell />
}
