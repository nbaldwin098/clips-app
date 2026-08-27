/**
 * Stripe webhooks — Connect + checkout settlement.
 *
 * Secrets (Supabase Edge Function secrets):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   SUPABASE_SERVICE_ROLE_KEY (auto)
 *   SUPABASE_URL (auto)
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Stripe Dashboard → Developers → Webhooks → Add endpoint:
 *   https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
 * Events: checkout.session.completed, account.updated
 *
 * Flow:
 *   checkout.session.completed → record settlement (idempotent) → credit
 *   creator_earnings 80% for tip/premium/post_purchase → Transfer when
 *   creator has Connect payouts_enabled; else leave available for manual payout.
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
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!stripeKey.startsWith('sk_') || !webhookSecret || !supabaseUrl || !serviceKey) {
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
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret)
  } catch (err) {
    console.error('signature', err)
    return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await onCheckoutCompleted(stripe, sb, event.data.object as Stripe.Checkout.Session)
    } else if (event.type === 'account.updated') {
      await onAccountUpdated(sb, event.data.object as Stripe.Account)
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('handler', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})

async function onAccountUpdated(
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
  // Retry pending transfers for this creator when payouts flip on
  if (account.payouts_enabled && userId) {
    await flushPendingTransfers(sb, userId, accountId)
  }
}

async function onCheckoutCompleted(
  stripe: Stripe,
  sb: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  const sessionId = session.id
  if (!sessionId) return

  const { data: existing } = await sb
    .from('stripe_settlements')
    .select('session_id')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (existing) return

  const meta = session.metadata || {}
  const kind = String(meta.kind || '')
  const payerUserId = String(meta.userId || '')
  const creatorId = String(meta.creatorId || '')
  const amountCents = Math.round(
    Number(meta.amountCents || session.amount_total || 0) || 0,
  )
  const currency = String(session.currency || 'usd').toLowerCase()

  const paysCreator = TIP_KINDS.has(kind) && !!creatorId && amountCents > 0
  const creatorShareCents = paysCreator ? Math.round(amountCents * CREATOR_SHARE) : 0
  const platformShareCents = paysCreator ? amountCents - creatorShareCents : amountCents

  const { error: insErr } = await sb.from('stripe_settlements').insert({
    session_id: sessionId,
    kind,
    payer_user_id: payerUserId || null,
    creator_id: creatorId || null,
    amount_cents: amountCents,
    creator_share_cents: creatorShareCents,
    platform_share_cents: platformShareCents,
    currency,
    status: 'settled',
    transfer_status: paysCreator ? 'pending' : 'none',
    meta: {
      contentId: meta.contentId || '',
      tierId: meta.tierId || '',
      orderId: meta.orderId || '',
      payment_status: session.payment_status,
    },
  })
  if (insErr) {
    // Race: another delivery won
    if (/duplicate|unique/i.test(insErr.message || '')) return
    throw insErr
  }

  if (!paysCreator || creatorShareCents <= 0) return

  // Credit creator earnings (80%) — service role bypasses RLS
  await creditCreatorEarnings(sb, creatorId, creatorShareCents / 100, kind)

  const { data: profile } = await sb
    .from('profiles')
    .select(
      'stripe_connect_account_id, stripe_connect_payouts_enabled',
    )
    .eq('id', creatorId)
    .maybeSingle()

  const connectId = profile?.stripe_connect_account_id as string | undefined
  const payoutsOn = !!profile?.stripe_connect_payouts_enabled

  if (connectId && payoutsOn) {
    await createTransfer(stripe, sb, {
      sessionId,
      creatorId,
      connectId,
      amountCents: creatorShareCents,
      currency,
    })
  }
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
  const dayUsd = Math.round((Number(daily?.usd || 0) + amount) * 100) / 100
  await sb.from('creator_earnings_daily').upsert({
    creator_id: creatorId,
    day,
    usd: dayUsd,
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

    await sb
      .from('stripe_connect_transfers')
      .update({
        stripe_transfer_id: transfer.id,
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferRowId)

    await sb
      .from('stripe_settlements')
      .update({
        transfer_id: transfer.id,
        transfer_status: 'paid',
      })
      .eq('session_id', opts.sessionId)

    // Move from available → connect_paid
    const usd = opts.amountCents / 100
    const { data: row } = await sb
      .from('creator_earnings')
      .select('available_usd, connect_paid_usd')
      .eq('creator_id', opts.creatorId)
      .maybeSingle()
    const available = Math.max(0, Number(row?.available_usd || 0) - usd)
    const connectPaid = Number(row?.connect_paid_usd || 0) + usd
    await sb
      .from('creator_earnings')
      .update({
        available_usd: Math.round(available * 100) / 100,
        connect_paid_usd: Math.round(connectPaid * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('creator_id', opts.creatorId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('transfer failed', message)
    await sb
      .from('stripe_connect_transfers')
      .update({
        status: 'failed',
        error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferRowId)
    await sb
      .from('stripe_settlements')
      .update({ transfer_status: 'failed' })
      .eq('session_id', opts.sessionId)
  }
}

async function flushPendingTransfers(
  sb: ReturnType<typeof createClient>,
  creatorId: string,
  connectId: string,
) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
  if (!stripeKey.startsWith('sk_')) return
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const { data: pending } = await sb
    .from('stripe_settlements')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('transfer_status', 'pending')
    .limit(50)

  for (const row of pending || []) {
    if (!row.creator_share_cents) continue
    await createTransfer(stripe, sb, {
      sessionId: row.session_id,
      creatorId,
      connectId,
      amountCents: row.creator_share_cents,
      currency: row.currency || 'usd',
    })
  }
}
