import SiteChrome from '../SiteChrome'
import { PrivacyPolicy } from '../../src/components/legal/LegalPages'

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for calabi.us.',
  alternates: { canonical: '/legal-privacy' },
}

export default function PrivacyRoute() {
  return (
    <SiteChrome>
      <PrivacyPolicy />
    </SiteChrome>
  )
}
