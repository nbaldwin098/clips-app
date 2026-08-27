/**
 * Stripe Connect Express onboarding via Edge Function `create-connect-account`.
 * Returns honest errors when the function or STRIPE_SECRET_KEY is missing.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

export function connectOnboardingAvailable() {
  return isSupabaseConfigured()
}

/**
 * Start Connect Express onboarding. Redirects to Stripe when successful.
 * @returns {{ ok: boolean, url?: string, message: string, status: string }}
 */
export async function startConnectOnboarding() {
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
    const { data, error } = await sb.functions.invoke('create-connect-account', { body: {} })
    if (error) {
      const msg = error.message || 'Connect function failed.'
      if (/not found|404|Failed to send/i.test(msg)) {
        return {
          ok: false,
          message: 'Deploy create-connect-account in Supabase and set STRIPE_SECRET_KEY (see docs/INFRA.md).',
          status: 'fn_missing',
        }
      }
      return { ok: false, message: msg, status: 'fn_error' }
    }
    if (data?.error === 'not_configured') {
      return {
        ok: false,
        message: data?.message || 'STRIPE_SECRET_KEY missing on the Edge Function.',
        status: 'not_configured',
      }
    }
    if (data?.error) {
      return { ok: false, message: String(data.error), status: 'stripe_error' }
    }
    if (!data?.url) {
      return {
        ok: false,
        message: 'Connect did not return an onboarding URL. Check Stripe Connect is enabled.',
        status: 'no_url',
      }
    }
    return { ok: true, url: data.url, message: 'Opening Stripe Connect…', status: 'redirect' }
  } catch (err) {
    return { ok: false, message: err?.message || 'Connect failed.', status: 'exception' }
  }
}
