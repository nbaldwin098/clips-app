/**
 * Stripe webhooks — Connect + checkout settlement.
 *
 * Accounts v2 / Event Destinations (what Stripe shows you now):
 *   - payment_intent.succeeded   (tips / coins / shop pay)
 *   - v2.core.account.updated    (creator Connect status)
 *
 * Legacy (still handled if present):
 *   - checkout.session.completed
 *   - account.updated
 *
 * Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
 */
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const CREATOR_SHARE = 0.8
const TIP_KINDS = new Set(['live_tip', 'post_tip', 'premium', 'post_purchase'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405 })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
  const webhookSecrets = [
    Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
    Deno.env.get('STRIPE_WEBHOOK_SECRET_THIN') || '',
    Deno.env.get('STRIPE_WEBHOOK_SECRET_2') || '',
  ].flatMap((s) => String(s).split(',').map((x) => x.trim()).filter(Boolean))
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!stripeKey.startsWith('sk_') || !webhookSecrets.length || !supabaseUrl || !serviceKey) {
    console.error('stripe-webhook missing secrets')
    return new Response(JSON.stringify({ error: 'not_configured' }), { status: 500 })
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })
  const sb = createClient(supabaseUrl, serviceKey)

  const sig = req.headers.get('stripe-signature') || ''
  const raw = await req.text()

  let eventType = ''
  let eventData: Record<string, unknown> = {}
  let verified = false
  let lastErr: unknown = null

  // Snapshot destinations (payment_intent.succeeded) and thin destinations
  // (v2.core.account.updated) each have their own signing secret — try all.
  for (const secret of webhookSecrets) {
    try {
      const event = stripe.webhooks.constructEvent(raw, sig, secret)
      eventType = event.type
      eventData = event.data?.object as unknown as Record<string, unknown>
      verified = true
      break
    } catch (err) {
      lastErr = err
      try {
        stripe.webhooks.signature.verifyHeader(raw, sig, secret)
        const thin = JSON.parse(raw) as Record<string, unknown>
        eventType = String(thin.type || '')
        eventData = thin
        verified = true
        break
      } catch (err2) {
        lastErr = err2
      }
    }
  }
  if (!verified) {
    console.error('signature', lastErr)
    return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 400 })
  }

  try {
    if (eventType === 'payment_intent.succeeded') {
      await onPaymentIntentSucceeded(stripe, sb, eventData as unknown as Stripe.PaymentIntent)
    } else if (eventType === 'checkout.session.completed') {
      await onCheckoutCompleted(stripe, sb, eventData as unknown as Stripe.Checkout.Session)
    } else if (eventType === 'account.updated') {
      await onAccountUpdated(stripe, sb, eventData as unknown as Stripe.Account)
    } else if (eventType === 'v2.core.account.updated') {
      await onAccountV2Updated(stripe, sb, eventData)
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('handler', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})

async function onAccountV2Updated(
  stripe: Stripe,
  sb: ReturnType<typeof createClient>,
  thin: Record<string, unknown>,
) {
  const related = thin.related_object as { id?: string } | undefined
  const accountId = related?.id || String((thin.data as { object?: { id?: string } })?.object?.id || '')
  if (!accountId) return
  const account = await stripe.accounts.retrieve(accountId)
  await onAccountUpdated(stripe, sb, account)
}

async function onAccountUpdated(
  _stripe: Stripe,
  sb: ReturnType<typeof createClient>,
  account: Stripe.Account,
) {
  const accountId = account.id
  const userId = account.metadata?.user_id
  const patch = {
    stripe_connect_account_id: accountId,
    stripe_connect_charges_enabled: !!account.charges_enabled,
    stripe_connect_payouts_enabled: !!account.payouts_enabled,
    stripe_connect_details_submitted: !!account.details_submitted,
    stripe_connect_updated_at: new Date().toISOString(),
  }
  if (userId) {
    await sb.from('profiles').update(patch).eq('id', userId)
  } else {
    await sb.from('profiles').update(patch).eq('stripe_connect_account_id', accountId)
  }
  if (account.payouts_enabled && userId) {
    await flushPendingTransfers(sb, userId, accountId)
  }
}

async function onPaymentIntentSucceeded(
  stripe: Stripe,
  sb: ReturnType<typeof createClient>,
  pi: Stripe.PaymentIntent,
) {
  const settlementId = pi.id
  if (!settlementId) return
  const meta = (pi.metadata || {}) as Record<string, string>
  // Skip PaymentIntents with no calabi metadata (not from our Checkout)
  if (!meta.kind && !meta.userId) return
  const listCents = Math.round(
    Number(meta.listAmountCents || meta.amountCents || pi.amount_received || pi.amount || 0) || 0,
  )
  const feeCents = Math.round(Number(meta.platformFeeCents || 0) || 0)
  await settlePayment(stripe, sb, {
    settlementId,
    kind: String(meta.kind || ''),
    payerUserId: String(meta.userId || ''),
    creatorId: String(meta.creatorId || ''),
    amountCents: listCents,
    feeCents,
    currency: String(pi.currency || 'usd').toLowerCase(),
    extraMeta: {
      contentId: meta.contentId || '',
      tierId: meta.tierId || '',
      orderId: meta.orderId || '',
      payment_intent: pi.id,
      listAmountCents: listCents,
      platformFeeCents: feeCents,
      chargeCents: Math.round(Number(meta.chargeCents || listCents + feeCents) || 0),
    },
  })
}

async function onCheckoutCompleted(
  stripe: Stripe,
  sb: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  const settlementId = session.id
  if (!settlementId) return
  const meta = (session.metadata || {}) as Record<string, string>
  const listCents = Math.round(
    Number(meta.listAmountCents || meta.amountCents || session.amount_total || 0) || 0,
  )
  const feeCents = Math.round(Number(meta.platformFeeCents || 0) || 0)
  await settlePayment(stripe, sb, {
    settlementId,
    kind: String(meta.kind || ''),
    payerUserId: String(meta.userId || ''),
    creatorId: String(meta.creatorId || ''),
    amountCents: listCents,
    feeCents,
    currency: String(session.currency || 'usd').toLowerCase(),
    extraMeta: {
      contentId: meta.contentId || '',
      tierId: meta.tierId || '',
      orderId: meta.orderId || '',
      payment_status: session.payment_status,
      listAmountCents: listCents,
      platformFeeCents: feeCents,
      chargeCents: Math.round(Number(meta.chargeCents || listCents + feeCents) || 0),
    },
  })
}

async function settlePayment(
  stripe: Stripe,
  sb: ReturnType<typeof createClient>,
  opts: {
    settlementId: string
    kind: string
    payerUserId: string
    creatorId: string
    amountCents: number
    feeCents?: number
    currency: string
    extraMeta: Record<string, unknown>
  },
) {
  const { data: existing } = await sb
    .from('stripe_settlements')
    .select('session_id')
    .eq('session_id', opts.settlementId)
    .maybeSingle()
  if (existing) return

  const listCents = opts.amountCents
  const feeCents = Math.max(0, Math.round(Number(opts.feeCents) || 0))
  // Creator share is 80% of list price only — platform fee stays 100% platform.
  const paysCreator = TIP_KINDS.has(opts.kind) && !!opts.creatorId && listCents > 0
  const creatorShareCents = paysCreator ? Math.round(listCents * CREATOR_SHARE) : 0
  const platformShareCents = paysCreator
    ? (listCents - creatorShareCents) + feeCents
    : listCents + feeCents

  const { error: insErr } = await sb.from('stripe_settlements').insert({
    session_id: opts.settlementId,
    kind: opts.kind,
    payer_user_id: opts.payerUserId || null,
    creator_id: opts.creatorId || null,
    amount_cents: listCents + feeCents,
    creator_share_cents: creatorShareCents,
    platform_share_cents: platformShareCents,
    currency: opts.currency,
    status: 'settled',
    transfer_status: paysCreator ? 'manual' : 'none',
    meta: opts.extraMeta,
  })
  if (insErr) {
    if (/duplicate|unique/i.test(insErr.message || '')) return
    throw insErr
  }

  if (!paysCreator || creatorShareCents <= 0) return

  await creditCreatorEarnings(sb, opts.creatorId, creatorShareCents / 100, opts.kind)

  // Stripe Express Transfers are OFF — creators withdraw via Studio → Earnings;
  // ops pays from Admin → Payouts. Leave available_usd for calabi-owned payouts.
}

async function creditCreatorEarnings(
  sb: ReturnType<typeof createClient>,
  creatorId: string,
  usd: number,
  kind: string,
) {
  const amount = Math.round(usd * 100) / 100
  if (amount <= 0) return
  const { data: row } = await sb
    .from('creator_earnings')
    .select('*')
    .eq('creator_id', creatorId)
    .maybeSingle()

  const tips = Number(row?.tips_usd || 0)
  const subs = Number(row?.subs_usd || 0)
  const packs = Number(row?.packs_usd || 0)
  const available = Number(row?.available_usd || 0)
  const lifetime = Number(row?.lifetime_usd || 0)
  const pending = Number(row?.pending_usd || 0)
  const connectPaid = Number(row?.connect_paid_usd || 0)
  const isTip = kind === 'live_tip' || kind === 'post_tip' || kind === 'post_purchase'
  const isSub = kind === 'premium'

  await sb.from('creator_earnings').upsert({
    creator_id: creatorId,
    available_usd: Math.round((available + amount) * 100) / 100,
    pending_usd: pending,
    lifetime_usd: Math.round((lifetime + amount) * 100) / 100,
    tips_usd: Math.round((tips + (isTip ? amount : 0)) * 100) / 100,
    subs_usd: Math.round((subs + (isSub ? amount : 0)) * 100) / 100,
    packs_usd: packs,
    connect_paid_usd: connectPaid,
    updated_at: new Date().toISOString(),
  })

  const day = new Date().toISOString().slice(0, 10)
  const { data: daily } = await sb
    .from('creator_earnings_daily')
    .select('usd')
    .eq('creator_id', creatorId)
    .eq('day', day)
    .maybeSingle()
  await sb.from('creator_earnings_daily').upsert({
    creator_id: creatorId,
    day,
    usd: Math.round((Number(daily?.usd || 0) + amount) * 100) / 100,
  })
}

async function createTransfer(
  stripe: Stripe,
  sb: ReturnType<typeof createClient>,
  opts: {
    sessionId: string
    creatorId: string
    connectId: string
    amountCents: number
    currency: string
  },
) {
  const transferRowId = `tr_${opts.sessionId}`
  await sb.from('stripe_connect_transfers').upsert({
    id: transferRowId,
    session_id: opts.sessionId,
    creator_id: opts.creatorId,
    connect_account_id: opts.connectId,
    amount_cents: opts.amountCents,
    currency: opts.currency,
    status: 'pending',
    updated_at: new Date().toISOString(),
  })

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: opts.amountCents,
        currency: opts.currency,
        destination: opts.connectId,
        transfer_group: opts.sessionId,
        metadata: {
          session_id: opts.sessionId,
          creator_id: opts.creatorId,
        },
      },
      { idempotencyKey: `connect-transfer-${opts.sessionId}` },
    )

    await sb.from('stripe_connect_transfers').update({
      stripe_transfer_id: transfer.id,
      status: 'paid',
      updated_at: new Date().toISOString(),
    }).eq('id', transferRowId)

    await sb.from('stripe_settlements').update({
      transfer_id: transfer.id,
      transfer_status: 'paid',
    }).eq('session_id', opts.sessionId)

    const usd = opts.amountCents / 100
    const { data: row } = await sb
      .from('creator_earnings')
      .select('available_usd, connect_paid_usd')
      .eq('creator_id', opts.creatorId)
      .maybeSingle()
    await sb.from('creator_earnings').update({
      available_usd: Math.round(Math.max(0, Number(row?.available_usd || 0) - usd) * 100) / 100,
      connect_paid_usd: Math.round((Number(row?.connect_paid_usd || 0) + usd) * 100) / 100,
      updated_at: new Date().toISOString(),
    }).eq('creator_id', opts.creatorId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('transfer failed', message)
    await sb.from('stripe_connect_transfers').update({
      status: 'failed',
      error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq('id', transferRowId)
    await sb.from('stripe_settlements').update({ transfer_status: 'failed' }).eq('session_id', opts.sessionId)
  }
}

async function flushPendingTransfers(
  _sb: ReturnType<typeof createClient>,
  _creatorId: string,
  _connectId: string,
) {
  // Express auto-transfers disabled — calabi-owned withdraw queue.
  return
}
