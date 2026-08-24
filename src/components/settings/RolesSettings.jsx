import { Users } from 'lucide-react'

export default function RolesSettings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Moderators, VIPs, and editors are not assignable yet. There is no invite that actually sends.
        </p>
      </div>
      <section>
        <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center">
          <Users className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No secondary roles</p>
        </div>
      </section>
      <section className="rounded-xl border border-zinc-800 p-4 space-y-2 text-sm text-zinc-400">
        <p className="font-medium text-white">When this ships</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Moderator: timeout, ban, delete messages</li>
          <li>VIP: badge</li>
          <li>Editor: titles and thumbnails (not payouts)</li>
        </ul>
      </section>
    </div>
  )
}
