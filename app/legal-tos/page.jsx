import SiteChrome from '../SiteChrome'
import { TermsOfService } from '../../src/components/legal/LegalPages'

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for calabi.us.',
  alternates: { canonical: '/legal-tos' },
}

export default function TermsRoute() {
  return (
    <SiteChrome>
      <TermsOfService />
    </SiteChrome>
  )
}
