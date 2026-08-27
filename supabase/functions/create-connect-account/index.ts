/**
 * Stripe Connect Express — onboard + status.
 *
 * Secrets: STRIPE_SECRET_KEY, APP_PUBLIC_URL / SITE_URL
 * Deploy: supabase functions deploy create-connect-account
 *
 * Body:
 *   { "action": "status" }   → connect flags (no Stripe Link)
 *   { "action": "onboard" }  → create Express account + Account Link (default)
 */
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const appUrl = (
    Deno.env.get('APP_PUBLIC_URL') || Deno.env.get('SITE_URL') || 'https://calabi.us'
  ).replace(/\/$/, '')

  if (!stripeKey.startsWith('sk_')) {
    return json({
      error: 'not_configured',
      message: 'STRIPE_SECRET_KEY missing — enable Connect in Stripe Dashboard first (docs/OWN_CONNECT.md)',
    }, 501)
  }
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(supabaseUrl, serviceKey)
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user) return json({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const action = String(body.action || 'onboard').toLowerCase()

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted, display_name, handle',
    )
    .eq('id', user.id)
    .maybeSingle()

  let accountId = (profile?.stripe_connect_account_id as string | undefined) || ''

  // Refresh flags from Stripe when we have an account
  if (accountId) {
    try {
      const account = await stripe.accounts.retrieve(accountId)
      await supabase
        .from('profiles')
        .update({
          stripe_connect_charges_enabled: !!account.charges_enabled,
          stripe_connect_payouts_enabled: !!account.payouts_enabled,
          stripe_connect_details_submitted: !!account.details_submitted,
          stripe_connect_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (action === 'status') {
        return json({
          ok: true,
          accountId,
          chargesEnabled: !!account.charges_enabled,
          payoutsEnabled: !!account.payouts_enabled,
          detailsSubmitted: !!account.details_submitted,
          status: account.payouts_enabled
            ? 'ready'
            : account.details_submitted
              ? 'pending_review'
              : 'onboarding',
        })
      }
    } catch (e) {
      console.error('retrieve account', e)
      if (action === 'status') {
        return json({
          ok: true,
          accountId,
          chargesEnabled: !!profile?.stripe_connect_charges_enabled,
          payoutsEnabled: !!profile?.stripe_connect_payouts_enabled,
          detailsSubmitted: !!profile?.stripe_connect_details_submitted,
          status: 'unknown',
          message: 'Could not refresh from Stripe',
        })
      }
    }
  } else if (action === 'status') {
    return json({
      ok: true,
      accountId: '',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      status: 'not_started',
    })
  }

  // onboard
  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email || undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_profile: {
          name: (profile?.display_name || profile?.handle || 'calabi creator') as string,
          url: appUrl,
        },
        metadata: { user_id: user.id },
      })
      accountId = account.id
      await supabase
        .from('profiles')
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/settings/revenue?connect=refresh`,
      return_url: `${appUrl}/settings/revenue?connect=return`,
      type: 'account_onboarding',
    })

    return json({ ok: true, url: accountLink.url, accountId, status: 'onboarding' })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // Common when Connect is not enabled on the Stripe account
    if (/signed up for Connect|Connect is not enabled|responsible for negative/i.test(message)) {
      return json({
        error: 'connect_not_enabled',
        message: 'Enable Stripe Connect Express in the Stripe Dashboard (Settings → Connect). See docs/OWN_CONNECT.md',
      }, 501)
    }
    console.error(e)
    return json({ error: message }, 500)
  }
})
