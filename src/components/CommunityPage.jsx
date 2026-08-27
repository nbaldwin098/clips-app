import { useState } from 'react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import { listPosts, createPost } from '../lib/youtubeParity'

export default function CommunityPage({ onNavigate, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [text, setText] = useState('')
  const [posts, setPosts] = useState(() => (user ? listPosts(user.id) : []))

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-zinc-400">Sign in to post.</p>
        <button type="button" onClick={onOpenAuth} className="mt-3 h-9 px-4 rounded-lg bg-white text-black text-sm">Sign in</button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <PageHeader title="Community" onBack={() => onNavigate?.('home')} />
      <form
        className="space-y-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          createPost({ creatorId: user.id, handle: user.handle, text: text.trim() })
          setPosts(listPosts(user.id))
          setText('')
        }}
      >
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Share an update… (saved on this device)" className="w-full rounded-lg border border-[#2f2f37] bg-[#1f1f23] px-3 py-2 text-sm" />
        <button type="submit" className="h-9 px-3 rounded-lg bg-white text-black text-sm">Post</button>
      </form>
      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id} className="rounded-xl border border-[#2f2f37] bg-[#1f1f23] px-4 py-3 text-sm text-zinc-200">{p.text}</li>
        ))}
        {posts.length === 0 && <li className="text-sm text-zinc-500">No posts yet.</li>}
      </ul>
    </div>
  )
}
