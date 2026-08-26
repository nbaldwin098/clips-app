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
  const item = await fetchContentById(id)

  return (
    <>
      {/* Real HTML for crawlers / View Source. SpaShell covers this for interactive users. */}
      <article className="px-4 py-10 max-w-3xl mx-auto">
        {item ? (
          <>
            <p className="text-xs uppercase tracking-wider text-zinc-500">{item.type || 'post'}</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{item.title || 'Untitled'}</h1>
            {item.handle ? (
              <p className="mt-2 text-sm text-zinc-400">@{item.handle}</p>
            ) : null}
            {item.description ? (
              <p className="mt-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.description}</p>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">Watch this post on calabi.</p>
            )}
            {item.thumbUrl || item.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbUrl || item.mediaUrl}
                alt={item.title || 'Post media'}
                className="mt-6 w-full max-h-[480px] object-contain bg-black border border-zinc-800"
              />
            ) : null}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-white">Post unavailable</h1>
            <p className="mt-2 text-sm text-zinc-500">This link may be private, deleted, or not synced yet.</p>
          </>
        )}
      </article>
      <div className="fixed inset-0 z-20 bg-[#000000]">
        <SpaShell />
      </div>
    </>
  )
}
