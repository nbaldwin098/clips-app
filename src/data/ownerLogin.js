/** Site owner intercept — password is hashed. Plaintext is not stored here. */
export const OWNER_LOGIN = {
  id: 'owner-cs1',
  handle: 'cs1',
  displayName: 'Nicholas',
  email: 'cs1@calabi.local',
  passwordHash: 'sha256$cafe7911f352ee8b9714e48eaf448c2c$0666d3cb70d9595cb03b63863e75b05e880d3e5199948884fb7ece69506f31fa',
}

export function findOwnerLogin(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!e) return null
  if (e === OWNER_LOGIN.email) return OWNER_LOGIN
  if (e === 'kiddnixk@gmail.com') return OWNER_LOGIN
  return null
}

/** Hashed admin portal code. Render VITE_ADMIN_CODE overrides this when set. */
export const OWNER_ADMIN_CODE_HASH =
  'sha256$c1d2e3f405162738495a6b7c8d9e0f12$9adb07cfda7e07bb7bcfe6186f782af19fed30ec800e767db9924530a0b2ab38'
