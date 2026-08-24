import PageHeader from './PageHeader'
import StreamSettings from './settings/StreamSettings'

export default function StreamSettingsPage({ onNavigate }) {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <PageHeader title="Stream" onBack={() => onNavigate?.('dashboard')} />
      <StreamSettings />
    </div>
  )
}
