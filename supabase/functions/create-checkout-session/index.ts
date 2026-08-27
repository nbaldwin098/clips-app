// Creates a Stripe Checkout Session (own checkout — no Payment Links).
// Secrets (Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY=sk_test_... or sk_live_...
// Optional:
//   SITE_URL=https://calabi.us
//
// amountCents = list price (tip / premium / pack / item+shipping).
// A 4% platform fee is added automatically; buyers never see the %.
//
// Deploy:
//   supabase functions deploy create-checkout-session

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLATFORM_FEE_RATE = 0.04

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function platformFeeCents(listCents: number) {
  return Math.round(Math.max(0, listCents) * PLATFORM_FEE_RATE)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
  if (!stripeKey.startsWith('sk_')) {
    return json({ error: 'STRIPE_SECRET_KEY is not set on this Edge Function.' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const authHeader = req.headers.get('Authorization') || ''
  if (!supabaseUrl || !anon || !authHeader) {
    return json({ error: 'Sign in required.' }, 401)
  }

  const sb = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await sb.auth.getUser()
  if (userErr || !userData?.user?.id) {
    return json({ error: 'Sign in required.' }, 401)
  }
  const user = userData.user

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const kind = String(body.kind || 'premium')
  const listCents = Math.round(Number(body.amountCents) || 0)
  // Coin packs start at $0.99; tips/premium stay ≥ $1.00
  const minCents = (kind === 'coin_pack' || kind === 'calabi_cash') ? 99 : 100
  if (!Number.isFinite(listCents) || listCents < minCents) {
    return json({ error: `Minimum charge is $${(minCents / 100).toFixed(2)}.` }, 400)
  }
  if (listCents > 500_00) {
    return json({ error: 'Maximum charge is $500.00.' }, 400)
  }

  const feeCents = platformFeeCents(listCents)
  const chargeCents = listCents + feeCents

  const originRaw = String(body.origin || Deno.env.get('SITE_URL') || 'https://calabi.us').replace(/\/$/, '')
  let origin = 'https://calabi.us'
  try {
    const u = new URL(originRaw)
    if (u.protocol === 'https:' || u.hostname === 'localhost') origin = u.origin
  } catch {}

  const productName = String(body.productName || labelForKind(kind)).slice(0, 120)
  const creatorId = String(body.creatorId || '').slice(0, 80)
  const contentId = String(body.contentId || '').slice(0, 120)
  const tierId = String(body.tierId || '').slice(0, 40)
  const orderId = String(body.orderId || '').slice(0, 80)
  const email = String(body.email || user.email || '').slice(0, 200)

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const reference = String(
    body.reference
    || `${kind}:${user.id}:${creatorId || orderId || contentId || tierId}:${listCents}`,
  ).slice(0, 200)

  const meta = {
    kind,
    userId: user.id,
    creatorId,
    contentId,
    tierId,
    orderId,
    // list = creator split base; fee is platform-only
    amountCents: String(listCents),
    listAmountCents: String(listCents),
    platformFeeCents: String(feeCents),
    chargeCents: String(chargeCents),
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email || undefined,
      client_reference_id: reference,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: listCents,
            product_data: {
              name: productName,
              metadata: {
                kind,
                creatorId,
                contentId,
                tierId,
                orderId,
              },
            },
          },
        },
        ...(feeCents > 0
          ? [{
              quantity: 1,
              price_data: {
                currency: 'usd',
                unit_amount: feeCents,
                product_data: {
                  name: 'Platform fee',
                  description: 'Platform and fraud protection',
                },
              },
            }]
          : []),
      ],
      success_url: `${origin}/checkout?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?canceled=1`,
      metadata: meta,
      // Accounts v2 / Event Destinations often only expose payment_intent.succeeded —
      // copy the same metadata onto the PaymentIntent so the webhook can settle.
      payment_intent_data: {
        metadata: meta,
      },
    })

    if (!session.url) return json({ error: 'Stripe did not return a checkout URL.' }, 502)
    return json({
      ok: true,
      url: session.url,
      sessionId: session.id,
      listCents,
      feeCents,
      chargeCents,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    return json({ error: message }, 502)
  }
})

function labelForKind(kind: string) {
  switch (kind) {
    case 'live_tip':
      return 'Live tip · calabi'
    case 'post_tip':
      return 'Post tip · calabi'
    case 'post_purchase':
      return 'Paid post · calabi'
    case 'calabi_cash':
    case 'coin_pack':
      return 'Coin pack · calabi'
    case 'marketplace':
      return 'Shop order · calabi'
    case 'premium':
    default:
      return 'Channel premium · calabi'
  }
}
