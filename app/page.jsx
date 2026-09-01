import SpaShell from './SpaShell'
import { fetchRecentContent } from '../src/lib/contentServer.js'

export const revalidate = 60

export const metadata = {
  title: 'calabi',
  description: 'Watch clips, pics, and live streams from creators on calabi.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'calabi',
    description: 'Watch clips, pics, and live streams from creators.',
    url: 'https://calabi.us/',
  },
}

export default async function HomePage() {
  const items = await fetchRecentContent(24)

  return (
    <>
      {/* Crawler-visible home index. SpaShell covers this for interactive users. */}
      <section className="sr-only">
        <h1 className="text-3xl font-semibold text-white">calabi</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Watch clips, pics, and live streams from creators.
        </p>
        {items.length > 0 ? (
          <ul className="mt-8 space-y-4">
            {items.map((item) => (
              <li key={item.id} className="border-b border-zinc-800 pb-4">
                <a href={`/${item.id}`} className="text-white hover:underline font-medium">
                  {item.title || 'Untitled'}
                </a>
                <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
                  {item.type || 'post'}
                  {item.handle ? ` · @${item.handle}` : ''}
                </p>
                {item.description ? (
                  <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-sm text-zinc-500">New posts show up here as creators publish.</p>
        )}
      </section>
      <div className="fixed inset-0 z-20 bg-[#000000]">
        <SpaShell />
      </div>
    </>
  )
}
