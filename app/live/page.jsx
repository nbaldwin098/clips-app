import SpaShell from '../SpaShell'
import { sectionMetadata } from '../sectionMeta'

export const metadata = sectionMetadata('live')

export default function LiveRoute() {
  return <SpaShell />
}
