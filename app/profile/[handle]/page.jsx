import SpaShell from '../../SpaShell'
import {
  fetchContentByHandle,
  fetchProfileByHandle,
} from '../../../src/lib/contentServer.js'

export const revalidate = 60

export async function generateMetadata({ params }) {
  const { handle: raw } = await params
  const handle = String(raw || '').replace(/^@/, '')
  const profile = await fetchProfileByHandle(handle)
  const name = profile?.displayName || handle || 'Creator'
  const description = (profile?.bio || `Watch @${handle} on calabi`).slice(0, 200)
  const image = profile?.avatarUrl || ''
  return {
    title: `@${handle}`,
    description,
    alternates: { canonical: `/profile/${encodeURIComponent(handle)}` },
    openGraph: {
      title: `${name} · calabi`,
      description,
      url: `https://calabi.us/profile/${encodeURIComponent(handle)}`,
      type: 'profile',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary' : 'summary',
      title: `${name} · calabi`,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function ProfileRoute({ params }) {
  const { handle: raw } = await params
  const handle = String(raw || '').replace(/^@/, '')
  const profile = await fetchProfileByHandle(handle)
  const posts = await fetchContentByHandle(handle, 12)
  const name = profile?.displayName || handle || 'Creator'

  return (
    <>
      <article className="px-4 py-10 max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Creator</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">{name}</h1>
        <p className="mt-1 text-sm text-zinc-400">@{handle}</p>
        {profile?.bio ? (
          <p className="mt-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Creator on calabi.</p>
        )}
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={name}
            className="mt-6 w-24 h-24 object-cover border border-zinc-800 bg-zinc-900"
          />
        ) : null}
        {posts.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {posts.map((item) => (
              <li key={item.id}>
                <a href={`/${item.id}`} className="text-white hover:underline">
                  {item.title || 'Untitled'}
                </a>
                <span className="ml-2 text-xs text-zinc-500">{item.type || 'post'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
      <div className="fixed inset-0 z-20 bg-[#000000]">
        <SpaShell />
      </div>
    </>
  )
}
