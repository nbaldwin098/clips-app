import SiteChrome from '../SiteChrome'
import HelpPage from '../../src/components/HelpPage'

export const metadata = {
  title: 'Help',
  description: 'Common questions about watching and posting on calabi.us.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Help · calabi',
    description: 'Common questions about watching and posting on calabi.us.',
    url: 'https://calabi.us/help',
  },
}

export default function HelpRoute() {
  return (
    <SiteChrome>
      <HelpPage />
    </SiteChrome>
  )
}
