import SiteChrome from '../SiteChrome'
import AboutPage from '../../src/components/AboutPage'

export const metadata = {
  title: 'About',
  description: 'Why calabi exists — audience for creators, free follow, real premium memberships.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About · calabi',
    description: 'Why calabi exists — audience for creators, free follow, real premium memberships.',
    url: 'https://calabi.us/about',
  },
}

export default function AboutRoute() {
  return (
    <SiteChrome>
      <AboutPage />
    </SiteChrome>
  )
}
