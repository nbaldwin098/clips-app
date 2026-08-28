import { useState } from 'react'
import { Radio } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ensureStreamKey } from '../../lib/streamKeys'
import { liveWhipUrl } from '../../lib/liveIngest'
import { publishWhip } from '../../lib/whipPublish'
import { startLiveLobby, stopLiveLobby, getMyLiveState } from '../../lib/liveLobby'

export default function BrowserLiveGo({ getStream }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [on, setOn] = useState(() => !!getMyLiveState(user?.id)?.isLive)

  const run = async () => {
    if (!user?.id) {
      setNote('Sign in first.')
      return
    }
    setBusy(true)
    setNote('')
    try {
      if (on) {
        await stopLiveLobby(user)
        setOn(false)
        setNote('Live ended.')
        return
      }
      let stream = getStream?.()
      if (!stream || !stream.getTracks?.().length) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      }
      const key = ensureStreamKey(user.id)
      const whip = liveWhipUrl(key)
      const pub = await publishWhip(whip, stream)
      if (!pub.ok) {
        setNote(pub.error || 'Could not publish from browser.')
        return
      }
      const lobby = await startLiveLobby(user, { title: `${user.handle || 'Creator'} live` })
      if (!lobby.ok) {
        setNote(lobby.error || 'Published, but lobby failed.')
        return
      }
      setOn(true)
      setNote('You are live from this browser. Stay on this page.')
    } catch (err) {
      setNote(err?.message || 'Browser live failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="w-full h-10 inline-flex items-center justify-center gap-1.5 bg-[#eb0400] text-white text-xs font-semibold disabled:opacity-50"
      >
        <Radio className="h-3.5 w-3.5" />
        {busy ? 'Working…' : on ? 'End browser live' : 'Go live from here'}
      </button>
      {note ? <p className="text-[11px] text-amber-300 leading-relaxed">{note}</p> : null}
    </div>
  )
}
