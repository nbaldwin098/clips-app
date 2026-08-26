/**
 * Platform owner identity — kiddnixk signs in through Supabase like any other user.
 * Aliases resolve to the cloud Auth user (gmail preferred; cs1@calabi.us still tried).
 * Local password hashes are only for the admin portal code check, not site login.
 */
export const OWNER_LOGIN = {
  id: 'owner-kiddnixk', // legacy id — live sessions use the Supabase user uuid
  handle: 'kiddnixk',
  displayName: 'Nicholas',
  /** Preferred cloud email */
  email: 'kiddnixk@gmail.com',
  /** Older cloud email — still tried so existing Auth users can sign in */
  legacyCloudEmails: ['cs1@calabi.us'],
  passwordHash: 'sha256$5de84747bc1f609ecc05696ac30538f1$071a94618b7488983b35d0387686304ace964a4bc0d634c20496efcf4b06ee2c',
  passwordHashes: [
    'sha256$5de84747bc1f609ecc05696ac30538f1$071a94618b7488983b35d0387686304ace964a4bc0d634c20496efcf4b06ee2c',
    'sha256$b192ad7ce4da038f3f2ac2415fdfe160$d94e95511fafb2974e589f67057ada683ae5a011a137e31ef02dc8e7dcfceda8',
    'sha256$cafe7911f352ee8b9714e48eaf448c2c$0666d3cb70d9595cb03b63863e75b05e880d3e5199948884fb7ece69506f31fa',
    'sha256$c1d2e3f405162738495a6b7c8d9e0f12$d475b3f9776233f2e6b672d3484a0dbcf74ef0f991ee9dc0b9280481dc7756d3',
  ],
}

const OWNER_HANDLES = new Set(['kiddnixk'])

const OWNER_EMAILS = new Set([
  'kiddnixk@gmail.com',
  'cs1@calabi.us',
])

const OWNER_ALIASES = new Set([...OWNER_HANDLES, ...OWNER_EMAILS, 'cs1', 'sa6sysn'])

/** @deprecated No local-only owner sessions; always false for current owner. */
export function isLocalOwnerLogin() {
  return false
}

export function findOwnerLogin(value) {
  const e = String(value || '').trim().toLowerCase()
  if (!e) return null
  if (OWNER_ALIASES.has(e)) return OWNER_LOGIN
  return null
}

/**
 * Cloud emails to try for an owner alias (never *.local).
 * Order: typed email → preferred gmail → legacy calabi Auth emails.
 */
export function ownerCloudEmails(typed = '') {
  const t = String(typed || '').trim().toLowerCase()
  const list = []
  if (t.includes('@') && !t.endsWith('.local')) list.push(t)
  list.push(OWNER_LOGIN.email)
  for (const legacy of OWNER_LOGIN.legacyCloudEmails || []) list.push(legacy)
  return [...new Set(list.filter((e) => e.includes('@') && !e.endsWith('.local')))]
}

export function isOwnerAccount(user) {
  if (!user || typeof user !== 'object') return false
  if (findOwnerLogin(user.email) || findOwnerLogin(user.handle)) return true
  return false
}

export function ownerPasswordHashes() {
  return [...new Set([OWNER_LOGIN.passwordHash, ...(OWNER_LOGIN.passwordHashes || [])].filter(Boolean))]
}

/** Hashed admin portal code. Render VITE_ADMIN_CODE overrides this when set. */
export const OWNER_ADMIN_CODE_HASH =
  'sha256$c1d2e3f405162738495a6b7c8d9e0f12$9adb07cfda7e07bb7bcfe6186f782af19fed30ec800e767db9924530a0b2ab38'
