/**
 * Direct-message crypto: ECDH (P-256) key agreement + AES-GCM message
 * encryption, using only the browser's native Web Crypto API — no extra
 * dependency to ship. Each device holds its own key pair; the private
 * key is generated on-device and never sent anywhere. Two people derive
 * the same AES key from (my private key + their public key) without
 * either public key ever being secret, so the server can hand out public
 * keys freely and still never see a plaintext message.
 *
 * Honest trade-off: this is per-device, not per-account. Signing in on a
 * second device generates a fresh key pair, so that device cannot
 * decrypt messages exchanged before it existed. There is no key-backup
 * server here — that would mean a server that can read your messages.
 */
import { lsGet, lsSet } from './storage'

const CURVE = 'P-256'
const KEYPAIR_PREFIX = 'dm_keypair_'

function toBase64(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i])
  if (typeof btoa === 'function') return btoa(bin)
  return Buffer.from(bin, 'binary').toString('base64')
}

function fromBase64(str) {
  const bin = typeof atob === 'function' ? atob(str) : Buffer.from(String(str || ''), 'base64').toString('binary')
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function webcrypto() {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('This browser does not support Web Crypto, needed for encrypted messages.')
  return c
}

/** Generates a fresh ECDH key pair. Returns the public key (safe to publish) and the private key as an exportable JWK (stays local). */
export async function generateKeyPair() {
  const c = webcrypto()
  const pair = await c.subtle.generateKey({ name: 'ECDH', namedCurve: CURVE }, true, ['deriveKey'])
  const [publicRaw, privateJwk] = await Promise.all([
    c.subtle.exportKey('raw', pair.publicKey),
    c.subtle.exportKey('jwk', pair.privateKey),
  ])
  return { publicKeyBase64: toBase64(publicRaw), privateKeyJwk: privateJwk }
}

export async function importPrivateKey(jwk) {
  return webcrypto().subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: CURVE }, false, ['deriveKey'])
}

export async function importPublicKey(base64) {
  return webcrypto().subtle.importKey('raw', fromBase64(base64), { name: 'ECDH', namedCurve: CURVE }, false, [])
}

/** Both sides of a conversation derive this same AES-256-GCM key from their own private key + the other side's public key. */
export async function deriveSharedKey(privateKey, publicKey) {
  return webcrypto().subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptText(sharedKey, plaintext) {
  const c = webcrypto()
  const iv = c.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(String(plaintext ?? ''))
  const cipher = await c.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded)
  return { iv: toBase64(iv), ciphertext: toBase64(cipher) }
}

export async function decryptText(sharedKey, ivBase64, ciphertextBase64) {
  const c = webcrypto()
  const plain = await c.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivBase64) },
    sharedKey,
    fromBase64(ciphertextBase64)
  )
  return new TextDecoder().decode(plain)
}

export function loadStoredKeyPair(userId) {
  if (!userId) return null
  const stored = lsGet(`${KEYPAIR_PREFIX}${userId}`, null)
  return stored?.publicKeyBase64 && stored?.privateKeyJwk ? stored : null
}

/** Loads this device's key pair for the user, generating and persisting one on first use. */
export async function ensureDeviceKeyPair(userId) {
  if (!userId) return null
  const existing = loadStoredKeyPair(userId)
  if (existing) return existing
  const pair = await generateKeyPair()
  lsSet(`${KEYPAIR_PREFIX}${userId}`, pair)
  return pair
}
