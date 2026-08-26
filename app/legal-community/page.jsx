import SiteChrome from '../SiteChrome'
import { CommunityGuidelines } from '../../src/components/legal/LegalPages'

export const metadata = {
  title: 'Community Guidelines',
  description: 'Community Guidelines for calabi.us.',
  alternates: { canonical: '/legal-community' },
}

export default function CommunityGuidelinesRoute() {
  return (
    <SiteChrome>
      <CommunityGuidelines />
    </SiteChrome>
  )
}
