import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  listComments, addComment, toggleCommentLike, pinComment, heartComment, deleteComment,
} from '../lib/youtubeParity'

function openProfile(handle, userId) {
  try {
    if (typeof window !== 'undefined' && window.__clipsOpenProfile) {
      window.__clipsOpenProfile(handle, userId)
    }
  } catch {}
}

export default function CommentsPanel({ contentId, creatorId }) {
  const { user, isAuthenticated } = useAuth()
  const [rows, setRows] = useState(() => listComments(contentId))
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [sort, setSort] = useState('top')
  const refresh = () => setRows(listComments(contentId))
  const submit = (e) => {
    e.preventDefault()
    if (!isAuthenticated || !text.trim()) return
    addComment(contentId, { userId: user.id, handle: user.handle, text: text.trim(), parentId: replyTo })
    setText('')
    setReplyTo(null)
    refresh()
  }
  const top = rows.filter((c) => !c.parentId)
  const sorted = [...top].sort((a, b) =>
    sort === 'new'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : (b.likes || 0) - (a.likes || 0) || new Date(b.createdAt) - new Date(a.createdAt)
  )
  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-200 font-medium">{rows.length} comments</p>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-2 text-xs text-zinc-300">
          <option value="top">Top</option>
          <option value="new">Newest</option>
        </select>
      </div>
      {isAuthenticated ? (
        <form onSubmit={submit} className="flex gap-2 mb-4">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'} className="flex-1 h-10 rounded-lg border border-zinc-800 bg-[#0b0b0f] px-3 text-sm text-zinc-100" maxLength={5000} />
          <button type="submit" className="h-10 px-3 rounded-lg bg-[#007ACC] text-white text-xs">Post</button>
          {replyTo && <button type="button" onClick={() => setReplyTo(null)} className="text-xs text-zinc-500">Cancel</button>}
        </form>
      ) : (
        <p className="text-xs text-zinc-500 mb-4">Sign in to comment.</p>
      )}
      <div className="space-y-4">
        {sorted.map((c) => {
          const replies = rows.filter((r) => r.parentId === c.id)
          return (
            <div key={c.id} className="text-sm">
              <div className="flex gap-2">
                <button type="button" onClick={() => openProfile(c.handle, c.userId)} className="h-8 w-8 rounded-full bg-[#007ACC]/20 text-[#007ACC] text-xs font-semibold shrink-0">{(c.handle || '?')[0]?.toUpperCase()}</button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-400">
                    <button type="button" onClick={() => openProfile(c.handle, c.userId)} className="text-[#007ACC] hover:underline font-medium">@{c.handle}</button>
                    {c.pinned && <span className="ml-2 text-[10px] text-zinc-500">Pinned</span>}
                  </p>
                  <p className="text-zinc-200 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-zinc-500">
                    <button type="button" onClick={() => { if (!user) return; toggleCommentLike(contentId, c.id, user.id); refresh() }}>Like {c.likes || 0}</button>
                    <button type="button" onClick={() => setReplyTo(c.id)}>Reply</button>
                    {user?.id === creatorId && (
                      <>
                        <button type="button" onClick={() => { pinComment(contentId, c.id); refresh() }}>Pin</button>
                        <button type="button" onClick={() => { heartComment(contentId, c.id); refresh() }}>Heart</button>
                      </>
                    )}
                    {(user?.id === c.userId || user?.id === creatorId) && (
                      <button type="button" onClick={() => { deleteComment(contentId, c.id); refresh() }}>Delete</button>
                    )}
                  </div>
                  {replies.length > 0 && (
                    <div className="mt-2 ml-2 space-y-2 border-l border-zinc-800 pl-3">
                      {replies.map((r) => (
                        <div key={r.id}>
                          <button type="button" onClick={() => openProfile(r.handle, r.userId)} className="text-xs text-[#007ACC] hover:underline">@{r.handle}</button>
                          <p className="text-zinc-200 text-sm">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
