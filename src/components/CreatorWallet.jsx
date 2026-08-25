import PageHeader from './PageHeader'
import RevenueSettings from './settings/RevenueSettings'

export default function CreatorWallet({ onNavigate }) {
  return (
    <div className="min-h-full bg-[#000000]">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <PageHeader
          title="Wallet"
          subtitle="Payouts are sent by hand after you apply and are approved."
          onBack={() => onNavigate?.('dashboard')}
        />
        <RevenueSettings hideHeader onNavigate={onNavigate} />
      </div>
    </div>
  )
}
