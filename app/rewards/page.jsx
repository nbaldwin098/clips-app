import SpaShell from '../SpaShell'
import { sectionMetadata } from '../sectionMeta'

export const metadata = sectionMetadata('wallet')

/** Legacy /rewards → Wallet (client App aliases the view). */
export default function RewardsRoute() {
  return <SpaShell />
}
