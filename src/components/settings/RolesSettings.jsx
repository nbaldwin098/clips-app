import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getChannelStaff, setChannelStaff, addRole, removeRole, addBotCommand, removeBotCommand,
} from '../../lib/channelStaff'
import { listIndexedUsers } from '../../lib/moderation'

export default function RolesSettings() {
  const { user } = useAuth()
  const channelId = user?.id
  const [staff, setStaff] = useState(() => getChannelStaff(channelId))
  const [handle, setHandle] = useState('')
  const [role, setRole] = useState('mods')
  const [trigger, setTrigger] = useState('!discord')
  const [reply, setReply] = useState('')
  const [saved, setSaved] = useState('')

  const refresh = () => setStaff(getChannelStaff(channelId))

  const add = () => {
    const h = handle.replace(/^@/, '').trim()
    if (!h || !channelId) return
    const found = listIndexedUsers().find((u) => String(u.handle || '').toLowerCase() === h.toLowerCase())
    addRole(channelId, role, { handle: h, userId: found?.id || '' })
    setHandle('')
    refresh()
    setSaved('Role saved on this device.')
  }

  const saveRules = (partial) => {
    setChannelStaff(channelId, partial)
    refresh()
    setSaved('Saved.')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Roles, bots & rules</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Mods, VIPs, editors, chat bots, and channel rules for your live lobby. They run on this site’s chat store — not a separate Twitch/TikTok account.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Assign a role</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="handle"
            className="h-10 flex-1 min-w-[8rem] rounded-lg border border-zinc-800 bg-black px-3 text-sm"
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm">
            <option value="mods">Moderator</option>
            <option value="vips">VIP</option>
            <option value="editors">Editor</option>
          </select>
          <button type="button" onClick={add} className="h-10 px-4 rounded-lg bg-white text-black text-sm font-semibold">Add</button>
        </div>
        {['mods', 'vips', 'editors'].map((key) => (
          <div key={key}>
            <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">{key}</p>
            {(staff[key] || []).length === 0 ? (
              <p className="text-xs text-zinc-600">None</p>
            ) : (
              (staff[key] || []).map((row) => (
                <button
                  key={row.handle}
                  type="button"
                  onClick={() => { removeRole(channelId, key, row.handle); refresh() }}
                  className="mr-2 mb-1 h-7 px-2 rounded-md bg-[#1a1a22] text-xs text-zinc-200"
                >
                  @{row.handle} ×
                </button>
              ))
            )}
          </div>
        ))}
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Channel rules</h2>
        <p className="text-xs text-zinc-500">Viewers can type !rules in live chat. Mods can timeout, ban, and delete messages in chat.</p>
        <textarea
          value={staff.rules || ''}
          onChange={(e) => {
            const rules = e.target.value
            setStaff({ ...staff, rules })
            if (channelId) setChannelStaff(channelId, { rules })
            setSaved('Saved.')
          }}
          rows={4}
          className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
          placeholder="Be civil. No spam. No hate."
        />
        <p className="text-[11px] text-zinc-500">{saved || 'Saved as you type.'}</p>
      </section>

      <section className="pt-6 border-t border-zinc-800 space-y-3">
        <h2 className="text-sm font-semibold text-white">Chat bot</h2>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={staff.botsEnabled !== false} onChange={(e) => saveRules({ botsEnabled: e.target.checked })} />
          Run commands in my live chat
        </label>
        <input
          value={staff.botName || ''}
          onChange={(e) => {
            const botName = e.target.value
            setStaff({ ...staff, botName })
            if (channelId) setChannelStaff(channelId, { botName })
            setSaved('Saved.')
          }}
          className="w-full h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm"
          placeholder="Bot name"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={trigger} onChange={(e) => setTrigger(e.target.value)} className="h-10 w-32 rounded-lg border border-zinc-800 bg-black px-3 text-sm" placeholder="!command" />
          <input value={reply} onChange={(e) => setReply(e.target.value)} className="h-10 flex-1 rounded-lg border border-zinc-800 bg-black px-3 text-sm" placeholder="Reply text" />
          <button
            type="button"
            onClick={() => { addBotCommand(channelId, trigger, reply); setReply(''); refresh(); setSaved('Command saved.') }}
            className="h-10 px-3 rounded-lg border border-zinc-700 text-sm"
          >
            Add command
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">Built-in: !rules. Custom commands are like Nightbot/TikTok keyword replies on this site only.</p>
        {(staff.commands || []).map((c) => (
          <button
            key={c.trigger}
            type="button"
            onClick={() => { removeBotCommand(channelId, c.trigger); refresh() }}
            className="block text-left text-xs text-zinc-400"
          >
            {c.trigger} — {c.reply} ×
          </button>
        ))}
      </section>
      {saved ? <p className="text-xs text-zinc-500">{saved}</p> : null}
    </div>
  )
}
