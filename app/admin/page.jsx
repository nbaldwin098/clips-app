import SpaShell from '../SpaShell'
import { sectionMetadata } from '../sectionMeta'

export const metadata = sectionMetadata('admin')

export default function AdminRoute() {
  return <SpaShell />
}
