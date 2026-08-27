/**
 * Admin withdraw queue client — calabi-owned payouts (no Stripe Express).
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

async function invoke(action, body = {}) {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Cloud not configured.', requests: [] }
  }
  const sb = await getSupabase()
  if (!sb) return { ok: false, message: 'Could not reach cloud.', requests: [] }
  const { data: sessionData } = await sb.auth.getSession()
  if (!sessionData?.session?.access_token) {
    return { ok: false, message: 'Sign in as owner first.', requests: [] }
  }
  try {
    const { data, error } = await sb.functions.invoke('admin-withdraw', {
      body: { action, ...body },
    })
    if (error) {
      const msg = error.message || 'admin-withdraw failed'
      if (/not found|404|Failed to send/i.test(msg)) {
        return {
          ok: false,
          message: 'Deploy admin-withdraw Edge Function (see docs/OWN_PAYOUTS.md).',
          requests: [],
          status: 'fn_missing',
        }
      }
      return { ok: false, message: msg, requests: [] }
    }
    if (data?.error) {
      return { ok: false, message: String(data.error), requests: data.requests || [] }
    }
    return {
      ok: true,
      message: data?.message || '',
      requests: data?.requests || [],
      status: data?.status || '',
      requestId: data?.requestId || '',
      amountUsd: data?.amountUsd,
    }
  } catch (err) {
    return { ok: false, message: err?.message || 'Withdraw admin failed.', requests: [] }
  }
}

export async function listPendingWithdrawals() {
  return invoke('list')
}

export async function markWithdrawalPaid(requestId) {
  return invoke('mark_paid', { requestId })
}

export async function rejectWithdrawal(requestId) {
  return invoke('reject', { requestId })
}
