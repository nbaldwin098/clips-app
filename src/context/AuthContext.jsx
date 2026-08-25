import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { lsGet, lsSet, lsRemove } from '../lib/storage'
import { indexUser, validateHandle, normalizeHandle, isPlatformOwner } from '../lib/moderation'
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { pullWatchProgressFromCloud } from '../lib/watchProgress'
import { setGraphActor, syncGraphFromCloud } from '../lib/graphSync'
import { ensureOwnProfile, privilegesFromProfile, updateOwnProfileFields } from '../lib/profiles'
import { setAdViewer, fetchViewerShowAds } from '../lib/adPrefs'
import { setVastViewerShowAds } from '../lib/vastAds'
import { hashSecret, verifySecret } from '../lib/secrets'
import { persistableMediaUrl, restoreProfilePictures, persistProfilePicture } from '../lib/profileMedia'
import { findOfficialLogin } from '../data/publicMediaSeed'
import { findOwnerLogin, isLocalOwnerLogin, isOwnerAccount, OWNER_LOGIN } from '../data/ownerLogin'
import { accessBlockMessage } from '../lib/trustSafety'
import { findNamedAccountLogin, verifyNamedAccountPassword } from '../data/namedAccountsSeed'
import { sanitizeAuthError } from '../lib/authBrand'

const AuthContext = createContext(null)
const DEFAULT_USER = {
  id: 'user_local', email: '', displayName: 'Viewer', handle: 'viewer',
  isCreator: false, creatorStatus: 'none', avatar: null, role: 'user',
}
const PRIVILEGE_KEYS = new Set(['isPlatformAdmin', 'isCreator', 'creatorStatus', 'role', 'id', 'provider'])

function rejectIfBlocked(next) {
  const blocked = accessBlockMessage(next)
  if (blocked) throw new Error(blocked)
}

function persistableUser(u) {
  if (!u || typeof u !== 'object') return null
  const org = String(u.id || '').startsWith('org-')
  const localOwner = String(u.id || '') === OWNER_LOGIN.id
  const owner = isOwnerAccount(u)
  return {
    id: String(u.id || '').slice(0, 80),
    email: String(u.email || '').slice(0, 200),
    displayName: String(u.displayName || 'Viewer').slice(0, 80),
    handle: normalizeHandle(u.handle) || 'viewer',
    provider: localOwner ? 'local' : (u.provider === 'supabase' ? 'supabase' : 'local'),
    avatarUrl: persistableMediaUrl(u.avatarUrl) || '',
    phone: u.phone || '',
    bannerUrl: persistableMediaUrl(u.bannerUrl) || '',
    bio: String(u.bio || '').slice(0, 500),
    passwordHash: u.passwordHash || undefined,
    isCreator: org || owner,
    creatorStatus: org || owner ? 'approved' : 'none',
    isPlatformAdmin: owner,
    role: owner ? 'admin' : 'user',
  }
}

function sanitizeUser(u) {
  const persisted = persistableUser(u)
  if (!persisted?.id) return null
  const org = String(persisted.id).startsWith('org-')
  const owner = isOwnerAccount(persisted)
  return {
    ...DEFAULT_USER,
    ...persisted,
    isCreator: org || owner,
    creatorStatus: org || owner ? 'approved' : 'none',
    isPlatformAdmin: owner,
    role: owner ? 'admin' : 'user',
  }
}

function pickUniqueHandle(raw, exceptUserId = null) {
  let v = validateHandle(raw, { currentUserId: exceptUserId })
  if (v.ok) return v.handle
  let base = normalizeHandle(raw) || 'user'
  if (base.length < 3) base = 'user'
  if (!/^[a-z]/.test(base)) base = `u${base}`.slice(0, 24)
  for (let i = 0; i < 99; i++) {
    const tryH = (i === 0 ? base : `${base}${i}`).slice(0, 24)
    v = validateHandle(tryH, { currentUserId: exceptUserId })
    if (v.ok) return v.handle
  }
  return `user${Date.now().toString(36).slice(-6)}`
}

function mapSbUser(sbUser, meta = {}) {
  const email = sbUser.email || meta.email || ''
  const phone = sbUser.phone || meta.phone || ''
  const seed = email.split('@')[0] || phone.slice(-4) || 'user'
  const handle =
    meta.handle || sbUser.user_metadata?.handle || pickUniqueHandle(seed)
  const displayName =
    meta.displayName || sbUser.user_metadata?.display_name || seed || 'Viewer'
  return {
    ...DEFAULT_USER,
    id: sbUser.id,
    email,
    phone,
    displayName,
    handle: String(handle).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'user',
    provider: 'supabase',
    creatorStatus: 'none',
    isCreator: false,
    isPlatformAdmin: false,
    role: 'user',
    avatarUrl: persistableMediaUrl(meta.avatarUrl || sbUser.user_metadata?.avatar_url) || '',
    bannerUrl: persistableMediaUrl(meta.bannerUrl) || '',
    bio: meta.bio || '',
  }
}

async function readMfaState(sb) {
  try {
    const aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
    const needs = aal.data?.nextLevel === 'aal2' && aal.data?.currentLevel !== 'aal2'
    if (!needs) return { pending: false, factors: [] }
    const listed = await sb.auth.mfa.listFactors()
    return { pending: true, factors: listed.data?.totp || [] }
  } catch {
    return { pending: false, factors: [] }
  }
}

async function hydratePrivileges(mapped) {
  if (!mapped) return mapped
  const local = lsGet('user', null)
  try {
    const profile = await ensureOwnProfile(mapped)
    const owner = isPlatformOwner({ ...mapped, role: profile?.role })
    const priv = privilegesFromProfile(profile, owner)
    return {
      ...mapped,
      ...priv,
      displayName: profile?.display_name || mapped.displayName,
      handle: profile?.handle || mapped.handle,
      bio: profile?.bio || mapped.bio || local?.bio || '',
      avatarUrl: persistableMediaUrl(profile?.avatar_url) || persistableMediaUrl(local?.avatarUrl) || mapped.avatarUrl || '',
      bannerUrl: persistableMediaUrl(local?.bannerUrl) || mapped.bannerUrl || '',
      showAds: profile?.show_ads !== false,
    }
  } catch {
    const owner = isPlatformOwner(mapped)
    return {
      ...mapped,
      isPlatformAdmin: owner,
      isCreator: owner,
      creatorStatus: owner ? 'approved' : 'none',
      role: owner ? 'admin' : 'user',
      avatarUrl: persistableMediaUrl(mapped.avatarUrl) || persistableMediaUrl(local?.avatarUrl) || '',
      bannerUrl: persistableMediaUrl(mapped.bannerUrl) || persistableMediaUrl(local?.bannerUrl) || '',
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // With cloud auth configured, wait for the real session — never hydrate a
    // device-only user that would make uploads private to this browser.
    if (isSupabaseConfigured()) return null
    const u = sanitizeUser(lsGet('user', null))
    if (u && accessBlockMessage(u)) return null
    return u
  })
  const [mode, setMode] = useState(() => lsGet('mode', 'viewer'))
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured())
  const [mfaPending, setMfaPending] = useState(false)
  const [mfaFactors, setMfaFactors] = useState([])
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (user) lsSet('user', persistableUser(user))
    else lsRemove('user')
  }, [user])
  useEffect(() => { lsSet('mode', mode) }, [mode])

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    restoreProfilePictures(user.id, { avatarUrl: user.avatarUrl, bannerUrl: user.bannerUrl }).then((urls) => {
      if (!alive) return
      setUser((prev) => {
        if (!prev || prev.id !== user.id) return prev
        if (prev.avatarUrl === urls.avatarUrl && prev.bannerUrl === urls.bannerUrl) return prev
        return { ...prev, avatarUrl: urls.avatarUrl || prev.avatarUrl, bannerUrl: urls.bannerUrl || prev.bannerUrl }
      })
    })
    return () => { alive = false }
  }, [user?.id])

  useEffect(() => {
    setAdViewer(user)
    setVastViewerShowAds(user?.showAds !== false)
    if (!user?.id || user.provider !== 'supabase') return undefined
    let alive = true
    fetchViewerShowAds(user.id).then((show) => {
      if (!alive) return
      setUser((prev) => {
        if (!prev || prev.id !== user.id || prev.showAds === show) return prev
        return { ...prev, showAds: show }
      })
      setAdViewer({ ...user, showAds: show })
      setVastViewerShowAds(show)
    })
    return () => { alive = false }
  }, [user?.id, user?.provider])

  useEffect(() => {
    let unsub = () => {}
    ;(async () => {
      if (!isSupabaseConfigured()) { setAuthReady(true); return }
      try {
        const sb = await getSupabase()
        if (!sb) { setAuthReady(true); return }
        const { data: { session } } = await sb.auth.getSession()
        if (session?.user) {
          const mfa = await readMfaState(sb)
          setMfaPending(mfa.pending)
          setMfaFactors(mfa.factors)
          const mapped = await hydratePrivileges(mapSbUser(session.user))
          setUser(mapped)
          try { indexUser(mapped) } catch {}
          if (!mfa.pending) {
            try { await pullWatchProgressFromCloud(mapped.id) } catch {}
            setGraphActor(mapped)
            try { await syncGraphFromCloud() } catch {}
          }
        } else {
          setMfaPending(false)
          setMfaFactors([])
          setGraphActor(null)
          // Cloud is configured — never keep a device-only session. Those made
          // uploads visible only on this browser (nobody else could play them).
          setUser(null)
        }
        const { data } = sb.auth.onAuthStateChange(async (event, sess) => {
          if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
          if (sess?.user) {
            const mfa = await readMfaState(sb)
            setMfaPending(mfa.pending)
            setMfaFactors(mfa.factors)
            const mapped = await hydratePrivileges(mapSbUser(sess.user))
            setUser(mapped)
            try { indexUser(mapped) } catch {}
            if (!mfa.pending) {
              try { await pullWatchProgressFromCloud(mapped.id) } catch {}
              setGraphActor(mapped)
              try { await syncGraphFromCloud() } catch {}
            }
          } else {
            setMfaPending(false)
            setMfaFactors([])
            setGraphActor(null)
            setUser(null)
          }
        })
        unsub = () => data.subscription.unsubscribe()
      } catch (e) {
        console.warn('[Clips] Supabase session restore failed', e)
      } finally {
        setAuthReady(true)
      }
    })()
    return () => unsub()
  }, [])

  const login = useCallback(async (payload = {}) => {
    const email = typeof payload === 'string' ? payload : payload.email || ''
    const password = typeof payload === 'object' ? payload.password || '' : ''
    const displayName =
      typeof payload === 'object' && payload.displayName
        ? payload.displayName
        : email.split('@')[0] || 'Viewer'
    const modeAuth = typeof payload === 'object' && payload.mode === 'signup' ? 'signup' : 'signin'
    const handleRaw = (typeof payload === 'object' && payload.handle) || displayName || 'user'

    const owner = findOwnerLogin(email)
    if (owner) {
      if (modeAuth === 'signup') {
        throw new Error('That email is the site owner. Sign in instead.')
      }
      if (!password || password.length < 6) {
        throw new Error('Email and a password of at least 6 characters are required.')
      }
      const hashes = [owner.passwordHash, ...(owner.passwordHashes || [])]
      let ok = false
      const seen = new Set()
      for (const stored of hashes) {
        if (!stored || seen.has(stored)) continue
        seen.add(stored)
        if (await verifySecret(password, stored)) {
          ok = true
          break
        }
      }
      if (ok) {
        // When cloud auth is on, owner MUST get a real Supabase session.
        // A local-only owner session saves uploads on this device only — nobody
        // else can see or play them.
        if (isSupabaseConfigured()) {
          const sb = await getSupabase()
          if (!sb) throw new Error('Sign-in is temporarily unavailable. Try again.')
          const emails = [...new Set([
            'cs1@calabi.us',
            'kiddnixk@gmail.com',
            owner.email,
            String(email || '').includes('@') ? String(email).trim().toLowerCase() : '',
          ].filter(Boolean))]
          const finishOwner = async (sbUser) => {
            const mapped = await hydratePrivileges(mapSbUser(sbUser, {
              handle: owner.handle,
              displayName: owner.displayName,
            }))
            const next = {
              ...mapped,
              handle: owner.handle,
              displayName: owner.displayName,
              isCreator: true,
              creatorStatus: 'approved',
              isPlatformAdmin: true,
              role: 'admin',
            }
            const blocked = accessBlockMessage(next)
            if (blocked) throw new Error(blocked)
            setUser(next)
            setMode('creator')
            try { indexUser(next) } catch {}
            setGraphActor(next)
            try { await syncGraphFromCloud() } catch {}
            return next
          }
          for (const mail of emails) {
            const { data, error } = await sb.auth.signInWithPassword({ email: mail, password })
            if (error || !data?.user) continue
            return finishOwner(data.user)
          }
          // First cloud login for this password: create the hosted account.
          for (const mail of emails) {
            if (!String(mail).includes('@') || String(mail).endsWith('.local')) continue
            const { data, error } = await sb.auth.signUp({
              email: mail,
              password,
              options: { data: { display_name: owner.displayName, handle: owner.handle } },
            })
            if (error || !data?.user) continue
            if (data.session?.user) return finishOwner(data.session.user)
            if (data.user) {
              const again = await sb.auth.signInWithPassword({ email: mail, password })
              if (again.data?.user) return finishOwner(again.data.user)
            }
          }
          throw new Error('Wrong email or password.')
        }
        const next = {
          id: owner.id,
          email: owner.email,
          displayName: owner.displayName,
          handle: owner.handle,
          provider: 'local',
          avatarUrl: '',
          bannerUrl: '',
          bio: '',
          passwordHash: owner.passwordHash,
          isCreator: true,
          creatorStatus: 'approved',
          isPlatformAdmin: true,
          role: 'admin',
        }
        const blocked = accessBlockMessage(next)
        if (blocked) throw new Error(blocked)
        setUser(next)
        setMode('creator')
        try { indexUser(next) } catch {}
        return next
      }
      if (isLocalOwnerLogin(email) || !isSupabaseConfigured()) {
        throw new Error('Wrong email or password.')
      }
    }

    const org = findOfficialLogin(email)
    if (org) {
      if (modeAuth === 'signup') {
        throw new Error('That email is a library channel. Sign in instead.')
      }
      if (!password || password.length < 6) {
        throw new Error('Email and a password of at least 6 characters are required.')
      }
      const ok = await verifySecret(password, org.passwordHash)
      if (!ok) throw new Error('Wrong email or password.')
      const next = {
        id: org.id,
        email: org.email,
        displayName: org.displayName,
        handle: org.handle,
        provider: 'local',
        avatarUrl: org.avatarUrl || '',
        bannerUrl: org.bannerUrl || '',
        bio: org.bio || '',
        passwordHash: org.passwordHash,
        isCreator: true,
        creatorStatus: 'approved',
        isPlatformAdmin: false,
        role: 'user',
      }
      rejectIfBlocked(next)
      setUser(next)
      setMode('creator')
      try { indexUser(next) } catch {}
      return next
    }

    const named = findNamedAccountLogin(email)
    if (named) {
      if (modeAuth === 'signup') {
        throw new Error('That email is already a site account. Sign in instead.')
      }
      if (!password || password.length < 6) {
        throw new Error('Email and a password of at least 6 characters are required.')
      }
      if (!verifyNamedAccountPassword(named.n, password)) {
        throw new Error('Wrong email or password.')
      }
      const next = {
        id: named.id,
        email: named.email,
        displayName: named.displayName,
        handle: named.handle,
        provider: 'local',
        avatarUrl: named.avatarUrl,
        bannerUrl: named.bannerUrl,
        bio: '',
        isCreator: false,
        creatorStatus: 'none',
        isPlatformAdmin: false,
        role: 'user',
      }
      rejectIfBlocked(next)
      setUser(next)
      setMode('viewer')
      try { indexUser(next) } catch {}
      return next
    }

    if (isSupabaseConfigured() && email && password) {
      const sb = await getSupabase()
      if (sb) {
        if (modeAuth === 'signup') {
          const handle = pickUniqueHandle(handleRaw)
          const { data, error } = await sb.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: { data: { display_name: displayName, handle } },
          })
          if (error) throw new Error(sanitizeAuthError(error.message))
          if (data.user) {
            const mapped = await hydratePrivileges(mapSbUser(data.user, { displayName, handle }))
            rejectIfBlocked(mapped)
            setUser(mapped)
            setMode('viewer')
            try { indexUser(mapped) } catch {}
            setGraphActor(mapped)
            try { await syncGraphFromCloud() } catch {}
            return mapped
          }
          return { pendingEmailConfirm: true, email }
        }
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw new Error(sanitizeAuthError(error.message))
        const mapped = await hydratePrivileges(mapSbUser(data.user, { displayName }))
        rejectIfBlocked(mapped)
        setUser(mapped)
        setMode('viewer')
        try { indexUser(mapped) } catch {}
        const mfa = await readMfaState(sb)
        setMfaPending(mfa.pending)
        setMfaFactors(mfa.factors)
        if (!mfa.pending) {
          try { await pullWatchProgressFromCloud(mapped.id) } catch {}
          setGraphActor(mapped)
          try { await syncGraphFromCloud() } catch {}
        }
        return { ...mapped, needsMfa: mfa.pending }
      }
      throw new Error('Sign-in is temporarily unavailable. Try again.')
    }

    if (isSupabaseConfigured()) {
      throw new Error('Use your synced email and password.')
    }

    if (!email || !password || password.length < 6) {
      throw new Error('Email and a password of at least 6 characters are required.')
    }

    const existing = sanitizeUser(lsGet('user', null))
    if (existing && existing.email === email) {
      const stored = lsGet('user', null)
      if (!stored?.passwordHash) {
        throw new Error('This local account cannot be recovered. Create a new one.')
      }
      const ok = await verifySecret(password, stored.passwordHash)
      if (!ok) throw new Error('Invalid email or password')
      const next = { ...existing, displayName, passwordHash: stored.passwordHash }
      rejectIfBlocked(next)
      setUser(next)
      setMode('viewer')
      try { indexUser(next) } catch {}
      return next
    }

    const handle = pickUniqueHandle(handleRaw)
    const passwordHash = await hashSecret(password)
    const next = {
      ...DEFAULT_USER,
      id: `user_${Date.now()}`,
      email,
      displayName,
      handle,
      provider: 'local',
      passwordHash,
      creatorStatus: 'none',
      isCreator: false,
      isPlatformAdmin: false,
      role: 'user',
    }
    setUser(next)
    setMode('viewer')
    try { indexUser(next) } catch {}
    return next
  }, [])

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured()) {
        const sb = await getSupabase()
        if (sb) await sb.auth.signOut()
      }
    } catch {}
    setGraphActor(null)
    setUser(null)
    setMode('viewer')
    lsRemove('user')
    lsSet('mode', 'viewer')
  }, [])

  const sendPasswordReset = useCallback(async (rawEmail) => {
    const mail = String(rawEmail || '').trim().toLowerCase()
    if (!mail || !mail.includes('@')) throw new Error('Enter the email on your account.')
    if (isLocalOwnerLogin(mail)) {
      throw new Error('cs1 signs in with the site password. Email reset is not used for that account.')
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Password reset needs a calabi account on this site.')
    }
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not send a reset email right now.')
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
    const { error } = await sb.auth.resetPasswordForEmail(mail, { redirectTo })
    if (error) throw new Error(sanitizeAuthError(error.message))
    return true
  }, [])

  const loginWithOAuth = useCallback(async (provider) => {
    const labels = { apple: 'Apple', azure: 'Microsoft', twitter: 'X' }
    if (!labels[provider]) throw new Error('That sign-in is not available.')
    if (!isSupabaseConfigured()) {
      throw new Error(`${labels[provider]} sign-in is not turned on yet.`)
    }
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not reach sign-in.')
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) throw new Error(sanitizeAuthError(error.message))
    return { redirected: true }
  }, [])

  const sendPhoneCode = useCallback(async (rawPhone) => {
    const phone = normalizePhone(rawPhone)
    if (!phone) throw new Error('Enter a real phone number.')
    if (!isSupabaseConfigured()) throw new Error('Phone sign-in is not turned on yet.')
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not reach sign-in.')
    const { error } = await sb.auth.signInWithOtp({ phone })
    if (error) throw new Error(sanitizeAuthError(error.message))
    return { phone }
  }, [])

  const verifyPhoneCode = useCallback(async (rawPhone, token) => {
    const phone = normalizePhone(rawPhone)
    if (!phone || !String(token || '').trim()) throw new Error('Enter the code from your text.')
    if (!isSupabaseConfigured()) throw new Error('Phone sign-in is not turned on yet.')
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not reach sign-in.')
    const { data, error } = await sb.auth.verifyOtp({ phone, token: String(token).trim(), type: 'sms' })
    if (error) throw new Error(sanitizeAuthError(error.message))
    if (!data.user) throw new Error('That code did not work.')
    const mapped = await hydratePrivileges(mapSbUser(data.user, { phone }))
    setUser(mapped)
    setMode('viewer')
    try { indexUser(mapped) } catch {}
    const mfa = await readMfaState(sb)
    setMfaPending(mfa.pending)
    setMfaFactors(mfa.factors)
    if (!mfa.pending) {
      try { await pullWatchProgressFromCloud(mapped.id) } catch {}
      setGraphActor(mapped)
      try { await syncGraphFromCloud() } catch {}
    }
    return { ...mapped, needsMfa: mfa.pending }
  }, [])

  const completeMfa = useCallback(async (code) => {
    const factor = mfaFactors[0]
    if (!factor?.id) throw new Error('No authenticator is set on this account.')
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not reach sign-in.')
    const challenge = await sb.auth.mfa.challenge({ factorId: factor.id })
    if (challenge.error) throw new Error(sanitizeAuthError(challenge.error.message))
    const verified = await sb.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.data.id,
      code: String(code || '').trim(),
    })
    if (verified.error) throw new Error(sanitizeAuthError(verified.error.message))
    setMfaPending(false)
    if (user) {
      try { await pullWatchProgressFromCloud(user.id) } catch {}
      setGraphActor(user)
      try { await syncGraphFromCloud() } catch {}
    }
    return true
  }, [mfaFactors, user])

  const listMfaFactors = useCallback(async () => {
    if (!isSupabaseConfigured()) return []
    const sb = await getSupabase()
    if (!sb) return []
    const { data, error } = await sb.auth.mfa.listFactors()
    if (error) throw new Error(sanitizeAuthError(error.message))
    return data?.totp || []
  }, [])

  const startMfaEnroll = useCallback(async () => {
    if (!isSupabaseConfigured()) throw new Error('2FA is only for a signed-in calabi account.')
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not start 2FA.')
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Clips' })
    if (error) throw new Error(sanitizeAuthError(error.message))
    return data
  }, [])

  const finishMfaEnroll = useCallback(async (factorId, code) => {
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not finish 2FA.')
    const challenge = await sb.auth.mfa.challenge({ factorId })
    if (challenge.error) throw new Error(sanitizeAuthError(challenge.error.message))
    const verified = await sb.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: String(code || '').trim(),
    })
    if (verified.error) throw new Error(sanitizeAuthError(verified.error.message))
    return true
  }, [])

  const removeMfaFactor = useCallback(async (factorId) => {
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not turn off 2FA.')
    const { error } = await sb.auth.mfa.unenroll({ factorId })
    if (error) throw new Error(sanitizeAuthError(error.message))
    return true
  }, [])

  const updatePassword = useCallback(async (newPassword) => {
    if (!newPassword || newPassword.length < 6) throw new Error('Password must be at least 6 characters.')
    if (!isSupabaseConfigured()) throw new Error('Change password after you sign in with email.')
    const sb = await getSupabase()
    if (!sb) throw new Error('Could not update password.')
    const { error } = await sb.auth.updateUser({ password: newPassword })
    if (error) throw new Error(sanitizeAuthError(error.message))
    setPasswordRecovery(false)
    return true
  }, [])

  const updateProfile = useCallback((partial) => {
    if (!partial || typeof partial !== 'object') return
    const safe = { ...partial }
    for (const key of PRIVILEGE_KEYS) delete safe[key]
    if (safe.handle != null) {
      const cur = lsGet('user', null)
      const v = validateHandle(safe.handle, { currentUserId: cur?.id })
      if (!v.ok) throw new Error(v.error || 'Invalid handle')
      safe.handle = v.handle
    }
    if (safe.avatarUrl) safe.avatarUrl = persistableMediaUrl(safe.avatarUrl) || safe.avatarUrl
    if (safe.bannerUrl) safe.bannerUrl = persistableMediaUrl(safe.bannerUrl) || safe.bannerUrl
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...safe }
      lsSet('user', persistableUser(next))
      try { indexUser(next) } catch {}
      return next
    })
  }, [])

  const saveProfile = useCallback(async (partial = {}, drafts = {}) => {
    const cur = lsGet('user', null)
    const merged = { ...(cur || {}), ...partial }
    if (partial.handle != null) {
      const v = validateHandle(partial.handle, { currentUserId: cur?.id })
      if (!v.ok) throw new Error(v.error || 'Invalid handle')
      merged.handle = v.handle
    }
    const urls = await persistProfilePicture(
      { ...merged, provider: cur?.provider, id: cur?.id },
      { avatarDraft: drafts.avatar, bannerDraft: drafts.banner },
    )
    const nextPartial = {
      displayName: merged.displayName,
      handle: merged.handle,
      bio: merged.bio,
      avatarUrl: urls.avatarUrl,
      bannerUrl: urls.bannerUrl,
    }
    if (partial.showAds != null && cur?.provider === 'supabase' && cur?.id) {
      nextPartial.showAds = partial.showAds !== false
      await updateOwnProfileFields({ showAds: nextPartial.showAds })
      setAdViewer({ ...cur, ...nextPartial, provider: 'supabase' })
      setVastViewerShowAds(nextPartial.showAds)
    }
    updateProfile(nextPartial)
    return nextPartial
  }, [updateProfile])

  const enableCreatorMode = useCallback(() => {
    setUser((prev) => {
      if (prev?.creatorStatus === 'approved') {
        queueMicrotask(() => setMode('creator'))
      }
      return prev
    })
  }, [])

  const switchMode = useCallback((next) => { setMode(next) }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    mode,
    authReady,
    backend: isSupabaseConfigured() ? 'cloud' : 'local',
    synced: isSupabaseConfigured(),
    login,
    sendPasswordReset,
    loginWithOAuth,
    sendPhoneCode,
    verifyPhoneCode,
    mfaPending,
    passwordRecovery,
    clearPasswordRecovery: () => setPasswordRecovery(false),
    completeMfa,
    listMfaFactors,
    startMfaEnroll,
    finishMfaEnroll,
    removeMfaFactor,
    updatePassword,
    logout,
    updateProfile,
    saveProfile,
    enableCreatorMode,
    switchMode,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
