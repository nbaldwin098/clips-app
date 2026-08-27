/**
 * Sensitive payout destinations (bank routing/account, crypto addresses).
 * Local vault caches for the session; cloud `payout_secrets` is SOT when signed in.
 * withdraw_methods.details stays masked for display.
 */
import { lsGet, lsSet } from './storage'

const VAULT_KEY = 'calabi.payout.vault.v1'

function vaultAll() {
  return lsGet(VAULT_KEY, {}) || {}
}

export function maskBankAccount(account) {
  const s = String(account || '').replace(/\D/g, '')
  if (s.length < 4) return '••••'
  return `••••${s.slice(-4)}`
}

export function maskCryptoAddress(addr) {
  const s = String(addr || '').trim()
  if (s.length < 10) return '••••'
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

export function storePayoutSecret(creatorId, methodId, secret) {
  if (!creatorId || !methodId) return
  const all = vaultAll()
  const row = all[creatorId] || {}
  row[methodId] = {
    ...secret,
    storedAt: new Date().toISOString(),
  }
  all[creatorId] = row
  lsSet(VAULT_KEY, all)
  queueMicrotask(() => {
    pushPayoutSecretCloud(creatorId, methodId, secret).catch(() => {})
  })
}

export function getPayoutSecret(creatorId, methodId) {
  if (!creatorId || !methodId) return null
  return vaultAll()?.[creatorId]?.[methodId] || null
}

export function removePayoutSecret(creatorId, methodId) {
  if (!creatorId || !methodId) return
  const all = vaultAll()
  const row = all[creatorId] || {}
  delete row[methodId]
  all[creatorId] = row
  lsSet(VAULT_KEY, all)
  queueMicrotask(() => {
    removePayoutSecretCloud(creatorId, methodId).catch(() => {})
  })
}

export async function pushPayoutSecretCloud(creatorId, methodId, secret) {
  if (!creatorId || !methodId || !secret) return { ok: false }
  try {
    const { getSupabase, isSupabaseConfigured } = await import('./supabaseClient')
    if (!isSupabaseConfigured()) return { ok: false, error: 'Cloud not configured.' }
    const { getGraphActor } = await import('./graphSync')
    const actor = getGraphActor()
    if (!actor?.id || actor.id !== creatorId) return { ok: false, error: 'Wrong account.' }
    const sb = await getSupabase()
    if (!sb) return { ok: false }
    const { error } = await sb.from('payout_secrets').upsert({
      method_id: methodId,
      creator_id: creatorId,
      kind: secret.kind || 'paypal',
      payload: secret,
      updated_at: new Date().toISOString(),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message }
  }
}

export async function removePayoutSecretCloud(creatorId, methodId) {
  try {
    const { getSupabase, isSupabaseConfigured } = await import('./supabaseClient')
    if (!isSupabaseConfigured()) return { ok: false }
    const { getGraphActor } = await import('./graphSync')
    const actor = getGraphActor()
    if (!actor?.id || actor.id !== creatorId) return { ok: false }
    const sb = await getSupabase()
    if (!sb) return { ok: false }
    await sb.from('payout_secrets').delete().eq('method_id', methodId).eq('creator_id', creatorId)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function pullPayoutSecretsCloud(creatorId) {
  if (!creatorId) return { ok: false }
  try {
    const { getSupabase, isSupabaseConfigured } = await import('./supabaseClient')
    if (!isSupabaseConfigured()) return { ok: false }
    const { getGraphActor } = await import('./graphSync')
    const actor = getGraphActor()
    if (!actor?.id || actor.id !== creatorId) return { ok: false }
    const sb = await getSupabase()
    if (!sb) return { ok: false }
    const { data, error } = await sb.from('payout_secrets').select('*').eq('creator_id', creatorId)
    if (error) return { ok: false, error: error.message }
    const all = vaultAll()
    const row = all[creatorId] || {}
    for (const r of data || []) {
      row[r.method_id] = { ...(r.payload || {}), storedAt: r.updated_at || r.created_at }
    }
    all[creatorId] = row
    lsSet(VAULT_KEY, all)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message }
  }
}

export function buildMethodSummary(type, fields = {}) {
  if (type === 'bank') {
    const routing = String(fields.routingNumber || '').replace(/\D/g, '')
    const account = String(fields.accountNumber || '').replace(/\D/g, '')
    return {
      label: fields.label || 'Bank account',
      details: `Bank · routing ${routing.slice(0, 4)}•• · ${maskBankAccount(account)}`,
      secret: {
        kind: 'bank',
        routingNumber: routing,
        accountNumber: account,
        accountName: String(fields.accountName || '').slice(0, 120),
      },
    }
  }
  if (type === 'crypto') {
    const chain = fields.chain === 'btc' ? 'btc' : 'sol'
    const address = String(fields.address || '').trim()
    return {
      label: fields.label || (chain === 'btc' ? 'Bitcoin' : 'Solana'),
      details: `${chain.toUpperCase()} · ${maskCryptoAddress(address)}`,
      secret: {
        kind: 'crypto',
        chain,
        address,
      },
    }
  }
  if (type === 'venmo') {
    const handle = String(fields.handle || '').trim().replace(/^@/, '')
    return {
      label: fields.label || 'Venmo',
      details: handle ? `@${handle}` : 'Venmo',
      secret: { kind: 'venmo', handle },
    }
  }
  if (type === 'cashapp') {
    const tag = String(fields.tag || '').trim().replace(/^\$/, '')
    return {
      label: fields.label || 'Cash App',
      details: tag ? `$${tag}` : 'Cash App',
      secret: { kind: 'cashapp', tag },
    }
  }
  return {
    label: fields.label || 'PayPal',
    details: String(fields.email || fields.details || '').trim(),
    secret: {
      kind: 'paypal',
      email: String(fields.email || fields.details || '').trim(),
    },
  }
}
