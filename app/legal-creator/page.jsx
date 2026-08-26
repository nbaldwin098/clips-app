import SiteChrome from '../SiteChrome'
import { CreatorAgreement } from '../../src/components/legal/LegalPages'

export const metadata = {
  title: 'Creator Agreement',
  description: 'Creator Agreement for calabi.us.',
  alternates: { canonical: '/legal-creator' },
}

export default function CreatorAgreementRoute() {
  return (
    <SiteChrome>
      <CreatorAgreement />
    </SiteChrome>
  )
}
