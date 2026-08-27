import SpaShell from '../../SpaShell'
import { sectionMetadata } from '../../sectionMeta'

export const metadata = sectionMetadata('dashboard')

/** Studio sections: /dashboard/earnings, /dashboard/content, etc. */
export default function DashboardSectionRoute() {
  return <SpaShell />
}
