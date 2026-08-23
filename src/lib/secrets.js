function toHex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256hex(text) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure hashing is unavailable in this browser.')
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return toHex(buf)
}

export async function hashSecret(value) {
  const raw = String(value || '')
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const salt = toHex(saltBytes)
  const hash = await sha256hex(`${salt}:${raw}`)
  return `sha256$${salt}$${hash}`
}

export async function verifySecret(value, stored) {
  const raw = String(value || '')
  const rec = String(stored || '')
  if (!rec) return false
  if (!rec.startsWith('sha256$')) {
    return rec === raw
  }
  const parts = rec.split('$')
  const salt = parts[1]
  const hash = parts[2]
  if (!salt || !hash) return false
  const next = await sha256hex(`${salt}:${raw}`)
  return next === hash
}

export function isHashedSecret(stored) {
  return String(stored || '').startsWith('sha256$')
}
