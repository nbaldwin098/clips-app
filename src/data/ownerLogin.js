/** Site owner intercept — password is hashed. Plaintext is not stored here. */
export const OWNER_LOGIN = {
  id: 'owner-cs1',
  handle: 'cs1',
  displayName: 'Nicholas',
  email: 'cs1@calabi.local',
  passwordHash: 'sha256$b192ad7ce4da038f3f2ac2415fdfe160$d94e95511fafb2974e589f67057ada683ae5a011a137e31ef02dc8e7dcfceda8',
  passwordHashes: [
    'sha256$b192ad7ce4da038f3f2ac2415fdfe160$d94e95511fafb2974e589f67057ada683ae5a011a137e31ef02dc8e7dcfceda8',
    'sha256$cafe7911f352ee8b9714e48eaf448c2c$0666d3cb70d9595cb03b63863e75b05e880d3e5199948884fb7ece69506f31fa',
    'sha256$c1d2e3f405162738495a6b7c8d9e0f12$d475b3f9776233f2e6b672d3484a0dbcf74ef0f991ee9dc0b9280481dc7756d3',
  ],
}

const OWNER_ALIASES = new Set([
  OWNER_LOGIN.email,
  OWNER_LOGIN.handle,
  'kiddnixk@gmail.com',
  'sa6sysn',
])

export function findOwnerLogin(value) {
  const e = String(value || '').trim().toLowerCase()
  if (!e) return null
  if (OWNER_ALIASES.has(e)) return OWNER_LOGIN
  return null
}

/** Hashed admin portal code. Render VITE_ADMIN_CODE overrides this when set. */
export const OWNER_ADMIN_CODE_HASH =
  'sha256$c1d2e3f405162738495a6b7c8d9e0f12$9adb07cfda7e07bb7bcfe6186f782af19fed30ec800e767db9924530a0b2ab38'
