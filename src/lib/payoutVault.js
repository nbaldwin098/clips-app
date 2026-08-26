/**
 * Sensitive payout destinations (bank routing/account, crypto addresses).
 * Details stay in a dedicated vault key — not echoed into public profile settings.
 * Cloud withdraw_methods stores a masked summary; full secrets remain in this vault + upsert details when cloud is available.
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
  return {
    label: fields.label || 'PayPal',
    details: String(fields.email || fields.details || '').trim(),
    secret: {
      kind: 'paypal',
      email: String(fields.email || fields.details || '').trim(),
    },
  }
}
