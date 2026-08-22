import { Bell } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Notifications</h1>
      <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#EBF4FA] flex items-center justify-center">
          <Bell className="h-6 w-6 text-[#2C729B]" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-800">You are all caught up</p>
        <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Likes, comments, live starts, and payouts will show here when accounts and realtime are connected.
        </p>
      </div>
    </div>
  )
}
