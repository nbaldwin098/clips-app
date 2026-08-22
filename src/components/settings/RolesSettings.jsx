import { useState } from 'react'
import { Users } from 'lucide-react'

export default function RolesSettings() {
  const [query, setQuery] = useState('')
  const [roles] = useState([])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Assign Moderators, VIPs, and Editors with granular toggles.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Add member</h2>
        <div className="flex gap-2 max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username"
            className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <button className="h-10 px-4 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
            Invite
          </button>
        </div>
        <p className="text-xs text-slate-500">Backend membership lookup required for production invites.</p>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Current roles</h2>
        {roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-600">No secondary roles assigned</p>
          </div>
        ) : null}
      </section>
      <section className="rounded-xl border border-slate-200 p-4 space-y-2 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Permission matrix (planned)</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Moderator: timeout, ban, delete messages, manage AutoMod flags</li>
          <li>VIP: badge, optional chat priority</li>
          <li>Editor: manage VODs, titles, thumbnails (not payout settings)</li>
        </ul>
      </section>
    </div>
  )
}
