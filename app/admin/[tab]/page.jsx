import SpaShell from '../../SpaShell'
import { sectionMetadata } from '../../sectionMeta'

export const metadata = sectionMetadata('admin')

/** Admin tabs: /admin/finance, /admin/payouts, etc. */
export default function AdminTabRoute() {
  return <SpaShell />
}
