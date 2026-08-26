/**
 * Own Stripe Checkout via Supabase Edge Function (create-checkout-session).
 * Uses STRIPE_SECRET_KEY on the function — never VITE_STRIPE_PAYMENT_LINK.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { isStripeConfigured } from './stripeConfig'

export function ownCheckoutConfigured() {
  return isSupabaseConfigured()
}

/** True when cloud is configured — actual charge still needs a signed-in session. */
export function checkoutCanCharge() {
  return ownCheckoutConfigured()
}

/**
 * @param {object} opts
 * @param {string} opts.kind premium | live_tip | post_tip | post_purchase | calabi_cash | marketplace
 * @param {number} opts.amountCents
 * @param {string} [opts.productName]
 * @param {string} [opts.email]
 * @param {string} [opts.creatorId]
 * @param {string} [opts.contentId]
 * @param {string} [opts.tierId]
 * @param {string} [opts.orderId]
 * @param {string} [opts.reference]
 */
export async function createCheckoutSession(opts = {}) {
  const amountCents = Math.round(Number(opts.amountCents) || 0)
  if (amountCents < 100) {
    return { ok: false, url: '', message: 'Minimum charge is $1.00.', status: 'bad_amount' }
  }
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      url: '',
      message: 'Cloud is not configured (VITE_SUPABASE_URL / ANON_KEY).',
      status: 'no_supabase',
    }
  }

  const sb = await getSupabase()
  if (!sb) {
    return { ok: false, url: '', message: 'Could not reach cloud.', status: 'no_client' }
  }

  const { data: sessionData } = await sb.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    return {
      ok: false,
      url: '',
      message: 'Sign in with your cloud account first (email auth).',
      status: 'no_session',
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://calabi.us'
  try {
    const { data, error } = await sb.functions.invoke('create-checkout-session', {
      body: {
        kind: opts.kind || 'premium',
        amountCents,
        productName: opts.productName || '',
        email: opts.email || '',
        creatorId: opts.creatorId || '',
        contentId: opts.contentId || '',
        tierId: opts.tierId || '',
        orderId: opts.orderId || '',
        reference: opts.reference || '',
        origin,
      },
    })

    if (error) {
      const msg = error.message || 'Checkout function failed.'
      // Common when function is not deployed yet
      if (/not found|404|Failed to send/i.test(msg)) {
        return {
          ok: false,
          url: '',
          message: 'Checkout function is not deployed yet. Deploy create-checkout-session in Supabase.',
          status: 'fn_missing',
        }
      }
      return { ok: false, url: '', message: msg, status: 'fn_error' }
    }

    if (data?.error) {
      return { ok: false, url: '', message: String(data.error), status: 'stripe_error' }
    }
    if (!data?.url) {
      return {
        ok: false,
        url: '',
        message: isStripeConfigured()
          ? 'Stripe did not return a checkout URL. Check STRIPE_SECRET_KEY on the Edge Function.'
          : 'Checkout unavailable.',
        status: 'no_url',
      }
    }

    return {
      ok: true,
      url: data.url,
      sessionId: data.sessionId || '',
      message: 'Opening Stripe Checkout…',
      status: 'redirect',
    }
  } catch (err) {
    return {
      ok: false,
      url: '',
      message: err?.message || 'Checkout failed.',
      status: 'exception',
    }
  }
}
