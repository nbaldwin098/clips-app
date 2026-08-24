/**
 * Runtime tests for direct-message encryption. Does not need a live
 * Supabase project — this only exercises the crypto (src/lib/dmCrypto.js)
 * and the pure helpers in src/lib/directMessages.js.
 */
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
  clear: () => { store.clear() },
}

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL', msg)
  } else {
    console.log('ok', msg)
  }
}

const {
  generateKeyPair, importPrivateKey, importPublicKey, deriveSharedKey, encryptText, decryptText, ensureDeviceKeyPair,
} = await import('../src/lib/dmCrypto.js')
const { conversationIdFor } = await import('../src/lib/directMessages.js')

const alice = await generateKeyPair()
const bob = await generateKeyPair()

const aliceShared = await deriveSharedKey(await importPrivateKey(alice.privateKeyJwk), await importPublicKey(bob.publicKeyBase64))
const bobShared = await deriveSharedKey(await importPrivateKey(bob.privateKeyJwk), await importPublicKey(alice.publicKeyBase64))

const secret = 'the launch code is not actually 1234'
const { iv, ciphertext } = await encryptText(aliceShared, secret)
assert(!ciphertext.includes('launch') && !ciphertext.includes('1234'), 'ciphertext never contains the plaintext')
const decrypted = await decryptText(bobShared, iv, ciphertext)
assert(decrypted === secret, 'the recipient derives the same key and reads the message')

let thirdPartyFailed = false
try {
  const mallory = await generateKeyPair()
  const malloryShared = await deriveSharedKey(await importPrivateKey(mallory.privateKeyJwk), await importPublicKey(bob.publicKeyBase64))
  await decryptText(malloryShared, iv, ciphertext)
} catch {
  thirdPartyFailed = true
}
assert(thirdPartyFailed, 'a third party without the right private key cannot decrypt')

const pair1 = await ensureDeviceKeyPair('user-a')
const pair2 = await ensureDeviceKeyPair('user-a')
assert(pair1.publicKeyBase64 === pair2.publicKeyBase64, 'the same device reuses its key pair instead of rotating on every call')
assert(store.has('dm_keypair_user-a'), 'the key pair is persisted locally, not only in memory')
assert(!JSON.stringify([...store.values()]).includes(secret), 'nothing written to local storage ever contains a decrypted message')

assert(conversationIdFor('a', 'b') === conversationIdFor('b', 'a'), 'conversation id is the same regardless of who is asking')
assert(conversationIdFor('a', 'b') !== conversationIdFor('a', 'c'), 'different peers get different conversation ids')

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log('all direct-message crypto checks passed')
