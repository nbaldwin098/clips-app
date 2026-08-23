import { useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import MediaShelves from './MediaShelves'
import { useAuth } from '../context/AuthContext'
import { listPlaylists, createPlaylist, getPlaylist, removeFromPlaylist } from '../lib/youtubeParity'
import { getById } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'

export default function PlaylistsPage({ onNavigate, onOpenAuth, onPlayItem, onOpenPic, playlistId }) {
  const { user, isAuthenticated } = useAuth()
  const syncTick = useContentSyncTick()
  const [title, setTitle] = useState('')
  const [list, setList] = useState(() => (user ? listPlaylists(user.id) : []))
  const [openId, setOpenId] = useState(playlistId || null)

  const playlist = useMemo(() => (openId ? getPlaylist(openId) : null), [openId, list, syncTick])
  const items = useMemo(
    () => (playlist?.items || []).map((id) => getById(id)).filter(Boolean),
    [playlist, syncTick]
  )

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-zinc-400">Sign in to manage playlists.</p>
        <button type="button" onClick={onOpenAuth} className="mt-3 h-9 px-4 rounded-lg bg-white text-black text-sm">Sign in</button>
      </div>
    )
  }

  const refresh = () => setList(listPlaylists(user.id))

  if (playlist) {
    return (
      <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
        <PageHeader title={playlist.title} onBack={() => setOpenId(null)} />
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-16">This playlist is empty.</p>
        ) : (
          <>
            <MediaShelves items={items} onPlayItem={onPlayItem} onOpenPic={onOpenPic} />
            <ul className="mt-6 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span className="truncate">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => { removeFromPlaylist(playlist.id, item.id); refresh() }}
                    className="text-zinc-500 hover:text-white"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
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
          refresh()
          setTitle('')
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New playlist" className="flex-1 h-10 rounded-lg border border-[#2f2f37] bg-[#1f1f23] px-3 text-sm" />
        <button type="submit" className="h-10 px-3 rounded-lg bg-white text-black text-sm">Create</button>
      </form>
      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpenId(p.id)}
              className="w-full text-left rounded-xl border border-[#2f2f37] bg-[#1f1f23] px-4 py-3 text-sm hover:border-zinc-600"
            >
              {p.title} <span className="text-zinc-500 text-xs">({(p.items || []).length})</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-zinc-500">No playlists yet.</li>}
      </ul>
    </div>
  )
}
