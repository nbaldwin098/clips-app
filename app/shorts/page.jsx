import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Clips',
  description: 'Watch short vertical clips on calabi.',
  alternates: { canonical: '/clips' },
  robots: { index: false, follow: true },
}

/** Legacy /shorts alias → /clips */
export default function ShortsAlias() {
  redirect('/clips')
}
