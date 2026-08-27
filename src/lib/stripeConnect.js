/**
 * Stripe Connect Express — client helpers.
 * Onboarding + status via Edge Function `create-connect-account`.
 * Auto-payouts happen in `stripe-webhook` after checkout.session.completed.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

export function connectOnboardingAvailable() {
  return isSupabaseConfigured()
}

/**
 * @returns {{ ok: boolean, url?: string, message: string, status: string, accountId?: string }}
 */
export async function startConnectOnboarding() {
  return invokeConnect({ action: 'onboard' })
}

/**
 * @returns {{
 *   ok: boolean,
 *   status: 'not_started'|'onboarding'|'pending_review'|'ready'|'unknown'|string,
 *   accountId?: string,
 *   chargesEnabled?: boolean,
 *   payoutsEnabled?: boolean,
 *   detailsSubmitted?: boolean,
 *   message?: string,
 * }}
 */
export async function fetchConnectStatus() {
  const res = await invokeConnect({ action: 'status' })
  if (!res.ok && res.status === 'fn_missing') {
    return {
      ok: false,
      status: 'not_deployed',
      message: res.message,
      accountId: '',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    }
  }
  return {
    ok: res.ok || res.status === 'not_started' || !!res.accountId,
    status: res.connectStatus || res.status || 'unknown',
    accountId: res.accountId || '',
    chargesEnabled: !!res.chargesEnabled,
    payoutsEnabled: !!res.payoutsEnabled,
    detailsSubmitted: !!res.detailsSubmitted,
    message: res.message,
  }
}

export function connectStatusLabel(status) {
  switch (String(status || '')) {
    case 'ready':
      return 'Payouts enabled'
    case 'pending_review':
      return 'Stripe is reviewing your account'
    case 'onboarding':
      return 'Finish onboarding with Stripe'
    case 'not_started':
      return 'Not connected'
    case 'not_deployed':
      return 'Connect function not deployed yet'
    default:
      return 'Status unknown'
  }
}

async function invokeConnect({ action }) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Cloud is not configured (Supabase URL / anon key).',
      status: 'no_supabase',
    }
  }
  const sb = await getSupabase()
  if (!sb) {
    return { ok: false, message: 'Could not reach cloud.', status: 'no_client' }
  }
  const { data: sessionData } = await sb.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    return {
      ok: false,
      message: 'Sign in with your cloud account first.',
      status: 'no_session',
    }
  }
  try {
    const { data, error } = await sb.functions.invoke('create-connect-account', {
      body: { action: action || 'onboard' },
    })
    if (error) {
      const msg = error.message || 'Connect function failed.'
      if (/not found|404|Failed to send/i.test(msg)) {
        return {
          ok: false,
          message: 'Deploy create-connect-account in Supabase (see docs/OWN_CONNECT.md).',
          status: 'fn_missing',
        }
      }
      return { ok: false, message: msg, status: 'fn_error' }
    }
    if (data?.error === 'not_configured' || data?.error === 'connect_not_enabled') {
      return {
        ok: false,
        message: data?.message || 'Stripe Connect is not enabled yet.',
        status: 'not_configured',
      }
    }
    if (data?.error) {
      return { ok: false, message: String(data.error), status: 'stripe_error' }
    }
    if (action === 'status') {
      return {
        ok: true,
        accountId: data?.accountId || '',
        chargesEnabled: !!data?.chargesEnabled,
        payoutsEnabled: !!data?.payoutsEnabled,
        detailsSubmitted: !!data?.detailsSubmitted,
        connectStatus: data?.status || 'unknown',
        status: data?.status || 'unknown',
        message: data?.message || '',
      }
    }
    if (!data?.url) {
      return {
        ok: false,
        message: 'Connect did not return an onboarding URL. Check Stripe Connect is enabled.',
        status: 'no_url',
      }
    }
    return {
      ok: true,
      url: data.url,
      accountId: data.accountId || '',
      message: 'Opening Stripe Connect…',
      status: 'redirect',
    }
  } catch (err) {
    return { ok: false, message: err?.message || 'Connect failed.', status: 'exception' }
  }
}
