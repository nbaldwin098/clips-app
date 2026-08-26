import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { lsGet, lsSet, lsRemove } from '../lib/storage'
import { indexUser, validateHandle, normalizeHandle, isPlatformOwner } from '../lib/moderation'
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { pullWatchProgressFromCloud } from '../lib/watchProgress'
import { setGraphActor, syncGraphFromCloud } from '../lib/graphSync'
import { ensureOwnProfile, privilegesFromProfile, updateOwnProfileFields } from '../lib/profiles'
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
  const handle = meta.handle || sbUser.user_metadata?.handle || pickUniqueHandle(seed)
  const displayName = meta.displayName || sbUser.user_metadata?.display_name || seed || 'Viewer'
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
      if (modeAuth === 'signup') throw new Error('That email is the site owner. Sign in instead.')
      if (!password || password.length < 6) throw new Error('Email and a password of at least 6 characters are required.')
      const hashes = [owner.passwordHash, ...(owner.passwordHashes || [])]
      let ok = false
      const seen = new Set()
      for (const stored of hashes) {
        if (!stored || seen.has(stored)) continue
        seen.add(stored)
        if (await verifySecret(password, stored)) { ok = true; break }
      }
      if (ok) {
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
          const cloudErrors = []
          for (const mail of emails) {
            if (!String(mail).includes('@') || String(mail).endsWith('.local')) continue
            const { data, error } = await sb.auth.signInWithPassword({ email: mail, password })
            if (error || !data?.user) {
              if (error?.message) cloudErrors.push(`${mail}: ${error.message}`)
              continue
            }
            return finishOwner(data.user)
          }
          for (const mail of emails) {
            if (!String(mail).includes('@') || String(mail).endsWith('.local')) continue
            const { data, error } = await sb.auth.signUp({
              email: mail,
              password,
              options: { data: { display_name: owner.displayName, handle: owner.handle } },
            })
            if (error || !data?.user) {
              if (error?.message) cloudErrors.push(`signup ${mail}: ${error.message}`)
              continue
            }
            if (data.session?.user) return finishOwner(data.session.user)
            if (data.user) {
              const again = await sb.auth.signInWithPassword({ email: mail, password })
              if (again.data?.user) return finishOwner(again.data.user)
              if (again.error?.message) cloudErrors.push(`confirm ${mail}: ${again.error.message}`)
            }
          }
          const hint = cloudErrors.slice(0, 2).join(' · ')
          throw new Error(
            'Owner password is correct, but cloud sign-in failed. In Supabase → Authentication → Users, add cs1@calabi.us with this same password and turn off Confirm email for testing. '
            + (hint ? `(${hint})` : 'Then try again.'),
          )
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
        rejectIfBlocked(next)
        setUser(next)
        setMode('creator')
        try { indexUser(next) } catch {}
        return next
      }
      if (isLocalOwnerLogin(email) || !isSupabaseConfigured()) {
        throw new Error('Wrong email or password.')
      }
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
          if (!data.session?.user && data.user) {
            throw new Error('Check your email to confirm, then sign in.')
          }
          if (!data.session?.user) throw new Error('Sign-up did not return a session.')
          const mapped = await hydratePrivileges(mapSbUser(data.session.user, { handle, displayName }))
          rejectIfBlocked(mapped)
          setUser(mapped)
          setMode('viewer')
          try { indexUser(mapped) } catch {}
          setGraphActor(mapped)
          return mapped
        }
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw new Error(sanitizeAuthError(error.message))
        if (!data.user) throw new Error('Wrong email or password.')
        const mfa = await readMfaState(sb)
        setMfaPending(mfa.pending)
        setMfaFactors(mfa.factors)
        const mapped = await hydratePrivileges(mapSbUser(data.user))
        rejectIfBlocked(mapped)
        setUser(mapped)
        setMode(mapped.isCreator ? 'creator' : 'viewer')
        try { indexUser(mapped) } catch {}
        if (!mfa.pending) {
          setGraphActor(mapped)
          try { await syncGraphFromCloud() } catch {}
        }
        return mapped
      }
    }

    throw new Error('Wrong email or password.')
  }, [])

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured()) {
        const sb = await getSupabase()
        await sb?.auth.signOut()
      }
    } catch {}
    setUser(null)
    setMode('viewer')
    setMfaPending(false)
    setMfaFactors([])
    setGraphActor(null)
  }, [])

  const value = {
    user,
    setUser,
    mode,
    setMode,
    login,
    logout,
    authReady,
    mfaPending,
    mfaFactors,
    passwordRecovery,
    setPasswordRecovery,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
