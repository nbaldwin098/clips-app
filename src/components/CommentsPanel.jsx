import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  listComments, addComment, toggleCommentLike, pinComment, heartComment, deleteComment,
} from '../lib/youtubeParity'
import ChannelAvatar from './ChannelAvatar'
import PostedStamp from './PostedStamp'

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
    <div className="mt-6">
      <div className="flex items-center gap-4 mb-5">
        <p className="text-base font-semibold text-white">{rows.length} {rows.length === 1 ? 'comment' : 'comments'}</p>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 rounded-lg bg-transparent text-sm text-[#aaa]">
          <option value="top">Top</option>
          <option value="new">Newest</option>
        </select>
      </div>
      {isAuthenticated ? (
        <form onSubmit={submit} className="flex gap-3 mb-6">
          <ChannelAvatar src={user?.avatarUrl} name={user?.displayName || user?.handle} size={40} />
          <div className="flex-1 min-w-0">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
              className="w-full h-10 bg-transparent border-b border-[#3f3f3f] text-sm text-zinc-100 placeholder:text-[#aaa] focus:outline-none focus:border-white"
              maxLength={5000}
            />
            <div className="flex justify-end gap-2 mt-2">
              {replyTo && <button type="button" onClick={() => setReplyTo(null)} className="h-9 px-3 rounded-full text-xs text-zinc-300">Cancel</button>}
              <button type="submit" disabled={!text.trim()} className="h-9 px-4 rounded-full bg-white text-black text-xs font-semibold disabled:bg-[#272727] disabled:text-[#717171]">Post</button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-sm text-[#aaa] mb-6">Sign in to comment.</p>
      )}
      <div className="space-y-5">
        {sorted.map((c) => {
          const replies = rows.filter((r) => r.parentId === c.id)
          return (
            <div key={c.id} className="text-sm">
              <div className="flex gap-3">
                <button type="button" onClick={() => openProfile(c.handle, c.userId)}>
                  <ChannelAvatar name={c.handle} size={36} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#aaa]">
                    <button type="button" onClick={() => openProfile(c.handle, c.userId)} className="text-white hover:text-zinc-200 font-medium">@{c.handle}</button>
                    {c.createdAt ? <> · <PostedStamp at={c.createdAt} /></> : null}
                    {c.pinned && <span className="ml-2 text-[10px] text-[#aaa]">Pinned</span>}
                  </p>
                  <p className="text-zinc-100 mt-1 whitespace-pre-wrap leading-relaxed">{c.text}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-[12px] text-[#aaa]">
                    <button type="button" onClick={() => { if (!user) return; toggleCommentLike(contentId, c.id, user.id); refresh() }}>Like {c.likes || ''}</button>
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
                    <div className="mt-3 space-y-3 pl-2 border-l border-[#272727]">
                      {replies.map((r) => (
                        <div key={r.id} className="flex gap-2">
                          <ChannelAvatar name={r.handle} size={24} />
                          <div>
                            <p className="text-xs text-[#aaa]">
                              <button type="button" onClick={() => openProfile(r.handle, r.userId)} className="text-white font-medium">@{r.handle}</button>
                            </p>
                            <p className="text-zinc-100 mt-0.5">{r.text}</p>
                          </div>
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
