import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getIdVerificationForUser,
  isVerifiedChannel,
  submitIdVerification,
} from '../lib/verification'
import { isOfficialCreator } from '../lib/uiFormat'
import VerifiedBadge from './VerifiedBadge'

function SidePicker({ label, file, preview, onPick }) {
  return (
    <label className="block rounded-xl border border-dashed border-zinc-700 bg-[#121218] p-4 cursor-pointer hover:bg-[#18181f]">
      <p className="text-xs font-semibold text-white">{label}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">JPG, PNG, or WebP</p>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const next = e.target.files?.[0] || null
          onPick(next)
          e.target.value = ''
        }}
      />
      {preview ? (
        <img src={preview} alt="" className="mt-3 h-36 w-full object-contain rounded-lg bg-black" />
      ) : (
        <p className="mt-3 text-xs text-zinc-500">{file ? file.name : 'Tap to choose a photo'}</p>
      )}
    </label>
  )
}

export default function VerifyPage({ onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const existing = user ? getIdVerificationForUser(user.id) : null
  const alreadyOfficial = isOfficialCreator(user?.id, user?.handle)
  const alreadyVerified = isVerifiedChannel(user?.id, user?.handle)
  const [front, setFront] = useState(null)
  const [back, setBack] = useState(null)
  const [frontUrl, setFrontUrl] = useState('')
  const [backUrl, setBackUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const pick = (side, file) => {
    const url = file ? URL.createObjectURL(file) : ''
    if (side === 'front') {
      if (frontUrl) URL.revokeObjectURL(frontUrl)
      setFront(file)
      setFrontUrl(url)
    } else {
      if (backUrl) URL.revokeObjectURL(backUrl)
      setBack(file)
      setBackUrl(url)
    }
    setError('')
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto text-sm text-zinc-400">
        <button type="button" onClick={onOpenAuth} className="text-white font-medium">Sign in</button> to apply for a checkmark.
      </div>
    )
  }

  if (alreadyOfficial) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <h1 className="text-lg font-semibold text-white mb-4">Get verified</h1>
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5">
          <p className="text-sm text-white inline-flex items-center gap-2">
            Official channel <VerifiedBadge />
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Library channels keep the official checkmark. You do not upload an ID for these accounts.
          </p>
        </div>
      </div>
    )
  }

  if (alreadyVerified || existing?.status === 'approved') {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <h1 className="text-lg font-semibold text-white mb-4">Get verified</h1>
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5">
          <p className="text-sm text-white inline-flex items-center gap-2">
            Your checkmark is on <VerifiedBadge title="Verified" />
          </p>
          <p className="text-xs text-zinc-500 mt-2">This is separate from creator status. You can post for free or as a creator.</p>
        </div>
      </div>
    )
  }

  if (existing?.status === 'pending' || done) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <h1 className="text-lg font-semibold text-white mb-4">Get verified</h1>
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] p-5 text-sm text-zinc-200 space-y-2">
          <p>Front and back of your ID are in review.</p>
          <p className="text-zinc-400 text-xs">We will get back to you within 7 business days.</p>
        </div>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const result = await submitIdVerification({
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      frontFile: front,
      backFile: back,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error || 'Could not submit.')
      return
    }
    setDone(true)
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold text-white mb-3">Get verified</h1>
      <p className="text-sm text-zinc-400 mb-4">
        Upload a photo of the front and the back of a government ID. We will get back to you within 7 business days.
      </p>
      {existing?.status === 'denied' ? (
        <p className="mb-4 text-sm text-zinc-200 rounded-xl border border-zinc-800 bg-[#121218] px-4 py-3">
          Last review was denied{existing.note ? `: ${existing.note}` : '.'} Upload new photos to try again.
        </p>
      ) : null}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <SidePicker label="Front of ID" file={front} preview={frontUrl} onPick={(f) => pick('front', f)} />
          <SidePicker label="Back of ID" file={back} preview={backUrl} onPick={(f) => pick('back', f)} />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !front || !back}
          className="w-full h-10 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2"
        >
          <BadgeCheck className="h-4 w-4" />
          {busy ? 'Uploading…' : 'Submit for review'}
        </button>
      </form>
    </div>
  )
}
