import CalabiCashShop from '../CalabiCashShop'
import { SettingsPageHeader } from './SettingsTemplates'

/** Site-settings wallet — Calabi Cash + Gold Coins (viewer wallet). */
export default function WalletSettings() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Wallet"
        subtitle="Buy Calabi Cash and Gold Coins. Synced to your cloud account."
      />
      <CalabiCashShop />
    </div>
  )
}
