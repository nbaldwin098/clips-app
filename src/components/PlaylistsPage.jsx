import { useState } from 'react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import { listPlaylists, createPlaylist } from '../lib/youtubeParity'

export default function PlaylistsPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [title, setTitle] = useState('')
  const [list, setList] = useState(() => (user ? listPlaylists(user.id) : []))

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-zinc-400">Sign in to manage playlists.</p>
        <button type="button" onClick={onOpenAuth} className="mt-3 h-9 px-4 rounded-lg bg-white text-black text-sm">Sign in</button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <PageHeader title="Playlists" onBack={() => onNavigate?.('home')} />
      <form
        className="flex gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          createPlaylist({ userId: user.id, title: title.trim() })
          setList(listPlaylists(user.id))
          setTitle('')
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New playlist" className="flex-1 h-10 rounded-lg border border-[#2f2f37] bg-[#1f1f23] px-3 text-sm" />
        <button type="submit" className="h-10 px-3 rounded-lg bg-white text-black text-sm">Create</button>
      </form>
      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.id} className="rounded-xl border border-[#2f2f37] bg-[#1f1f23] px-4 py-3 text-sm">
            {p.title} <span className="text-zinc-500 text-xs">({(p.items || []).length})</span>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-zinc-500">No playlists yet.</li>}
      </ul>
    </div>
  )
}
