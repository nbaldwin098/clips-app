import CreatorAnalyticsPanel from './settings/CreatorAnalyticsPanel'

export default function AnalyticsPage({ onNavigate }) {
  return (
    <div className="min-h-full bg-[#000000]">
      <div className="p-4 md:p-6 max-w-[1120px] mx-auto">
        <CreatorAnalyticsPanel showBack onNavigate={onNavigate} />
      </div>
    </div>
  )
}
