import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getCommentPrefs, setCommentPrefs } from '../../lib/youtubeParity'

export default function CommentSettings() {
  const { user } = useAuth()
  const initial = getCommentPrefs(user?.id)
  const [showDonations, setShowDonations] = useState(initial.showDonationsOnComments !== false)
  const [sort, setSort] = useState(initial.defaultSort || 'top')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setCommentPrefs(user?.id, {
      showDonationsOnComments: showDonations,
      defaultSort: sort,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Comments</h1>
        <p className="mt-1 text-sm text-zinc-500">
          These apply to your comments on videos and pics. Live chat has its own Chat & Moderation page.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Donations on comments</h2>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={showDonations}
            onChange={(e) => setShowDonations(e.target.checked)}
          />
          <span className="text-sm text-zinc-300">
            Show how much I donated on my comments. Turn this off and the amount is hidden even if you already donated.
          </span>
        </label>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Default sort</h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 rounded-lg border border-zinc-800 bg-[#000000] px-3 text-sm text-zinc-100"
        >
          <option value="top">Top</option>
          <option value="new">Newest</option>
        </select>
        <button type="button" onClick={save} className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
          {saved ? 'Saved' : 'Save'}
        </button>
      </section>
    </div>
  )
}
