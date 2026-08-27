/**
 * Admin finance client — master ledger of every settled payment + platform fees.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

async function invoke(action, body = {}) {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Cloud not configured.', transactions: [], summary: null }
  }
  const sb = await getSupabase()
  if (!sb) return { ok: false, message: 'Could not reach cloud.', transactions: [], summary: null }
  const { data: sessionData } = await sb.auth.getSession()
  if (!sessionData?.session?.access_token) {
    return { ok: false, message: 'Sign in as owner first.', transactions: [], summary: null }
  }
  try {
    const { data, error } = await sb.functions.invoke('admin-finance', {
      body: { action, ...body },
    })
    if (error) {
      const msg = error.message || 'admin-finance failed'
      if (/not found|404|Failed to send/i.test(msg)) {
        return {
          ok: false,
          message: 'Deploy admin-finance Edge Function (see docs/ADMIN_FINANCE.md).',
          transactions: [],
          summary: null,
          status: 'fn_missing',
        }
      }
      return { ok: false, message: msg, transactions: [], summary: null }
    }
    if (data?.error) {
      return {
        ok: false,
        message: String(data.error),
        transactions: data.transactions || [],
        summary: data.summary || null,
        transaction: data.transaction || null,
      }
    }
    return {
      ok: true,
      message: '',
      transactions: data?.transactions || [],
      summary: data?.summary || null,
      transaction: data?.transaction || null,
    }
  } catch (err) {
    return {
      ok: false,
      message: err?.message || 'Finance admin failed.',
      transactions: [],
      summary: null,
    }
  }
}

export async function listFinanceTransactions({ limit = 80, kind = '', q = '' } = {}) {
  return invoke('list', { limit, kind, q })
}

export async function getFinanceSummary() {
  return invoke('summary')
}

export async function getFinanceTransaction(sessionId) {
  return invoke('get', { sessionId })
}

export function formatCents(cents) {
  return `$${(Math.round(Number(cents) || 0) / 100).toFixed(2)}`
}
