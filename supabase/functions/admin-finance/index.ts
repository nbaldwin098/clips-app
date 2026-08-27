/**
 * Admin finance — Stripe-like ledger of every settled checkout.
 * Owner-only via service role. Fees = meta.platformFeeCents (4% Platform fee).
 *
 * Deploy: supabase functions deploy admin-finance
 *
 * Body:
 *   { "action": "summary" }
 *   { "action": "list", "limit"?: 50, "kind"?: "premium", "q"?: "search" }
 *   { "action": "get", "sessionId": "…" }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OWNER_EMAILS = new Set(
  String(Deno.env.get('PLATFORM_OWNER_EMAILS') || 'kiddnixk@gmail.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
)
const OWNER_HANDLES = new Set(['kiddnixk', 'cs1'])

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function feeFromMeta(meta: Record<string, unknown> | null | undefined) {
  const m = meta || {}
  const n = Number(m.platformFeeCents ?? m.platform_fee_cents ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function listFromMeta(meta: Record<string, unknown> | null | undefined, amountCents: number, feeCents: number) {
  const m = meta || {}
  const n = Number(m.listAmountCents ?? m.list_amount_cents ?? 0)
  if (Number.isFinite(n) && n > 0) return Math.round(n)
  return Math.max(0, Math.round(amountCents) - feeCents)
}

function mapRow(r: Record<string, unknown>, profiles: Record<string, { handle?: string; display_name?: string }>) {
  const meta = (r.meta && typeof r.meta === 'object') ? r.meta as Record<string, unknown> : {}
  const amountCents = Math.round(Number(r.amount_cents) || 0)
  const feeCents = feeFromMeta(meta)
  const listCents = listFromMeta(meta, amountCents, feeCents)
  const creatorId = String(r.creator_id || '')
  const payerId = String(r.payer_user_id || '')
  const creator = profiles[creatorId] || {}
  const payer = profiles[payerId] || {}
  return {
    sessionId: r.session_id,
    kind: r.kind || '',
    status: r.status || '',
    currency: r.currency || 'usd',
    amountCents,
    listCents,
    feeCents,
    creatorShareCents: Math.round(Number(r.creator_share_cents) || 0),
    platformShareCents: Math.round(Number(r.platform_share_cents) || 0),
    transferStatus: r.transfer_status || 'none',
    transferId: r.transfer_id || '',
    creatorId,
    creatorHandle: creator.handle || '',
    creatorName: creator.display_name || '',
    payerUserId: payerId,
    payerHandle: payer.handle || '',
    payerName: payer.display_name || '',
    contentId: String(meta.contentId || meta.content_id || ''),
    tierId: String(meta.tierId || meta.tier_id || ''),
    orderId: String(meta.orderId || meta.order_id || ''),
    chargeCents: Math.round(Number(meta.chargeCents || meta.charge_cents || amountCents) || 0),
    meta,
    createdAt: r.created_at,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfigured' }, 500)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token)
  if (userError || !user) return json({ error: 'Unauthorized' }, 401)

  const email = String(user.email || '').toLowerCase()
  const { data: profile } = await admin
    .from('profiles')
    .select('handle, display_name')
    .eq('id', user.id)
    .maybeSingle()
  const handle = String(profile?.handle || '').toLowerCase().replace(/^@/, '')
  const ownerId = String(Deno.env.get('PLATFORM_OWNER_ID') || '')
  const isOwner =
    (ownerId && user.id === ownerId)
    || OWNER_EMAILS.has(email)
    || OWNER_HANDLES.has(handle)
  if (!isOwner) return json({ error: 'Forbidden — owner only' }, 403)

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const action = String(body.action || 'list').toLowerCase()

  async function loadProfiles(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))]
    const out: Record<string, { handle?: string; display_name?: string }> = {}
    if (!unique.length) return out
    const { data: ps } = await admin
      .from('profiles')
      .select('id, handle, display_name')
      .in('id', unique.slice(0, 200))
    for (const p of ps || []) out[p.id] = p
    return out
  }

  if (action === 'summary' || action === 'list') {
    const kindFilter = String(body.kind || '').trim()
    const q = String(body.q || '').trim().toLowerCase()
    const limit = Math.min(200, Math.max(1, Math.round(Number(body.limit) || 80)))

    let query = admin
      .from('stripe_settlements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (kindFilter) query = query.eq('kind', kindFilter)

    const { data: rows, error } = await query
    if (error) return json({ error: error.message }, 500)

    const profiles = await loadProfiles([
      ...(rows || []).map((r) => String(r.creator_id || '')),
      ...(rows || []).map((r) => String(r.payer_user_id || '')),
    ])

    let mapped = (rows || []).map((r) => mapRow(r, profiles))
    if (q) {
      mapped = mapped.filter((r) => {
        const hay = [
          r.sessionId, r.kind, r.creatorId, r.creatorHandle, r.payerUserId, r.payerHandle,
          r.contentId, r.orderId, r.tierId, r.status, r.transferStatus,
        ].join(' ').toLowerCase()
        return hay.includes(q)
      })
    }

    const summary = {
      count: mapped.length,
      grossCents: mapped.reduce((s, r) => s + r.amountCents, 0),
      listCents: mapped.reduce((s, r) => s + r.listCents, 0),
      feeCents: mapped.reduce((s, r) => s + r.feeCents, 0),
      creatorShareCents: mapped.reduce((s, r) => s + r.creatorShareCents, 0),
      platformShareCents: mapped.reduce((s, r) => s + r.platformShareCents, 0),
      byKind: {} as Record<string, number>,
    }
    for (const r of mapped) {
      const k = String(r.kind || 'other')
      summary.byKind[k] = (summary.byKind[k] || 0) + 1
    }

    if (action === 'summary') {
      return json({ ok: true, summary })
    }

    return json({
      ok: true,
      summary,
      transactions: mapped.slice(0, limit),
    })
  }

  if (action === 'get') {
    const sessionId = String(body.sessionId || '').slice(0, 200)
    if (!sessionId) return json({ error: 'sessionId required' }, 400)
    const { data: row, error } = await admin
      .from('stripe_settlements')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!row) return json({ error: 'Not found' }, 404)
    const profiles = await loadProfiles([
      String(row.creator_id || ''),
      String(row.payer_user_id || ''),
    ])
    return json({ ok: true, transaction: mapRow(row, profiles) })
  }

  return json({ error: 'Unknown action' }, 400)
})
