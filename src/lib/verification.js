import { lsGet, lsSet } from './storage'
import { processImageFile, storeMediaBlob } from './videoStorage'
import { isOfficialCreator } from './uiFormat'
import { notifyIdVerificationStatus, notifyIdVerificationSubmitted } from './notifications'

const KEY = 'clips_id_verifications'

export function listIdVerifications() {
  const list = lsGet(KEY, [])
  return Array.isArray(list) ? list : []
}

export function getIdVerificationForUser(userId) {
  if (!userId) return null
  return listIdVerifications().find((row) => row.userId === userId) || null
}

export function isIdVerified(userId, handle) {
  const h = String(handle || '').toLowerCase().replace(/^@/, '')
  return listIdVerifications().some((row) => {
    if (row.status !== 'approved') return false
    if (userId && row.userId === userId) return true
    if (h && String(row.handle || '').toLowerCase() === h) return true
    return false
  })
}

/** Official library channels keep their checkmark. Everyone else needs an accepted ID. */
export function isVerifiedChannel(id, handle) {
  if (isOfficialCreator(id, handle)) return true
  return isIdVerified(id, handle)
}

function isImageFile(file) {
  return !!file && String(file.type || '').startsWith('image/')
}

export async function submitIdVerification({ userId, handle, displayName, frontFile, backFile }) {
  if (!userId) return { ok: false, error: 'Sign in first.' }
  if (isOfficialCreator(userId, handle)) {
    return { ok: false, error: 'This channel already has the official checkmark.' }
  }
  const existing = getIdVerificationForUser(userId)
  if (existing?.status === 'pending') return { ok: false, error: 'Your ID is already in review.' }
  if (existing?.status === 'approved') return { ok: false, error: 'You already have a checkmark.' }
  if (!isImageFile(frontFile) || !isImageFile(backFile)) {
    return { ok: false, error: 'Upload a photo of the front and the back of your ID.' }
  }

  let front
  let back
  try {
    front = await processImageFile(frontFile)
    back = await processImageFile(backFile)
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not read those photos.' }
  }

  const id = `idv_${Date.now()}`
  await storeMediaBlob(`${id}_front`, front.displayFile || frontFile)
  await storeMediaBlob(`${id}_back`, back.displayFile || backFile)

  const row = {
    id,
    userId,
    handle: String(handle || '').replace(/^@/, ''),
    displayName: displayName || handle || 'User',
    status: 'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    note: '',
    frontThumb: front.thumbUrl || '',
    backThumb: back.thumbUrl || '',
    frontBlobId: `${id}_front`,
    backBlobId: `${id}_back`,
  }
  const list = listIdVerifications().filter((r) => r.userId !== userId)
  list.unshift(row)
  lsSet(KEY, list)
  notifyIdVerificationSubmitted(userId, row.handle)
  return { ok: true, row }
}

export function setIdVerificationStatus(appId, status, note = '') {
  const nextStatus = status === 'approved' ? 'approved' : 'denied'
  const list = listIdVerifications().map((row) => (
    row.id === appId
      ? { ...row, status: nextStatus, reviewedAt: new Date().toISOString(), note: String(note || '').slice(0, 280) }
      : row
  ))
  lsSet(KEY, list)
  const row = list.find((r) => r.id === appId)
  if (row?.userId) notifyIdVerificationStatus(row.userId, nextStatus, row.note)
  return row || null
}
