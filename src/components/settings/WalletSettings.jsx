import CalabiCashShop from '../CalabiCashShop'
import { SettingsPageHeader } from './SettingsTemplates'

/** Site-settings wallet — Coins for chat; tips/TTS via card / creator pricing. */
export default function WalletSettings() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Wallet"
        subtitle="Coins for chat cosmetics. Tips, TTS, and premium use card checkout or creator pricing."
      />
      <CalabiCashShop />
    </div>
  )
}
