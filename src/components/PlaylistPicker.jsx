import { useState } from 'react'
import { X, ListPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { listPlaylists, createPlaylist, addToPlaylist } from '../lib/youtubeParity'

export default function PlaylistPicker({ open, onClose, contentId, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [title, setTitle] = useState('')
  const [list, setList] = useState(() => (user ? listPlaylists(user.id) : []))
  const [saved, setSaved] = useState('')

  if (!open) return null

  const refresh = () => setList(user ? listPlaylists(user.id) : [])

  const add = (playlistId) => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    addToPlaylist(playlistId, contentId)
    setSaved(playlistId)
    refresh()
  }

  const make = (e) => {
    e.preventDefault()
    if (!isAuthenticated) { onOpenAuth?.(); return }
    if (!title.trim()) return
    const row = createPlaylist({ userId: user.id, title: title.trim() })
    addToPlaylist(row.id, contentId)
    setTitle('')
    setSaved(row.id)
    refresh()
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#1f1f23] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white inline-flex items-center gap-1.5"><ListPlus className="h-4 w-4" /> Add to playlist</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={make} className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New playlist" className="flex-1 h-9 rounded-lg border border-zinc-700 bg-[#000000] px-3 text-sm text-white" />
          <button type="submit" className="h-9 px-3 rounded-lg bg-white text-black text-xs font-bold">Create</button>
        </form>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p.id)}
              className="w-full text-left rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2 hover:border-zinc-600"
            >
              <span className="block text-sm text-zinc-100">{p.title}</span>
              <span className="block text-[11px] text-zinc-500">
                {(p.items || []).length} items{saved === p.id ? ' · added' : ''}
              </span>
            </button>
          ))}
          {list.length === 0 && <p className="text-xs text-zinc-500 px-1">No playlists yet.</p>}
        </div>
      </div>
    </div>
  )
}
