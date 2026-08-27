/**
 * Admin withdraw queue — lists pending creator withdrawals and marks them paid/rejected.
 * Uses service role after verifying the caller is the platform owner.
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY (auto), PLATFORM_OWNER_EMAIL (optional, default kiddnixk@gmail.com)
 * Deploy: supabase functions deploy admin-withdraw
 *
 * Body:
 *   { "action": "list" }
 *   { "action": "mark_paid", "requestId": "wr_…" }
 *   { "action": "reject", "requestId": "wr_…" }
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

  if (action === 'list') {
    const { data: rows, error } = await admin
      .from('withdraw_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100)
    if (error) return json({ error: error.message }, 500)

    const creatorIds = [...new Set((rows || []).map((r) => r.creator_id).filter(Boolean))]
    let profiles: Record<string, { handle?: string; display_name?: string }> = {}
    if (creatorIds.length) {
      const { data: ps } = await admin
        .from('profiles')
        .select('id, handle, display_name')
        .in('id', creatorIds)
      for (const p of ps || []) profiles[p.id] = p
    }

    const secretsByCreator: Record<string, unknown[]> = {}
    if (creatorIds.length) {
      const { data: secrets } = await admin
        .from('payout_secrets')
        .select('creator_id, method_id, payload, updated_at')
        .in('creator_id', creatorIds)
      for (const s of secrets || []) {
        const list = secretsByCreator[s.creator_id] || []
        list.push({
          methodId: s.method_id,
          secret: s.payload,
          updatedAt: s.updated_at,
        })
        secretsByCreator[s.creator_id] = list
      }
    }

    const requests = (rows || []).map((r) => {
      const p = profiles[r.creator_id] || {}
      const secrets = secretsByCreator[r.creator_id] || []
      const secret = secrets.find((s: { methodId?: string }) => s.methodId === r.method_id)
      return {
        id: r.id,
        creatorId: r.creator_id,
        handle: p.handle || '',
        displayName: p.display_name || '',
        amountUsd: Number(r.amount_usd) || 0,
        methodId: r.method_id,
        methodLabel: r.method_label || '',
        status: r.status,
        createdAt: r.created_at,
        payoutSecret: secret?.secret || null,
      }
    })

    return json({ ok: true, requests })
  }

  const requestId = String(body.requestId || '').slice(0, 80)
  if (!requestId) return json({ error: 'requestId required' }, 400)

  const { data: reqRow, error: reqErr } = await admin
    .from('withdraw_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()
  if (reqErr) return json({ error: reqErr.message }, 500)
  if (!reqRow) return json({ error: 'Request not found' }, 404)
  if (reqRow.status !== 'pending') {
    return json({ error: `Request is already ${reqRow.status}` }, 409)
  }

  const amount = Math.round((Number(reqRow.amount_usd) || 0) * 100) / 100
  const creatorId = String(reqRow.creator_id || '')

  if (action === 'mark_paid') {
    const { data: earn } = await admin
      .from('creator_earnings')
      .select('*')
      .eq('creator_id', creatorId)
      .maybeSingle()
    const pending = Math.max(0, Math.round(((Number(earn?.pending_usd) || 0) - amount) * 100) / 100)
    await admin.from('creator_earnings').upsert({
      creator_id: creatorId,
      available_usd: Number(earn?.available_usd) || 0,
      pending_usd: pending,
      lifetime_usd: Number(earn?.lifetime_usd) || 0,
      tips_usd: Number(earn?.tips_usd) || 0,
      subs_usd: Number(earn?.subs_usd) || 0,
      packs_usd: Number(earn?.packs_usd) || 0,
      updated_at: new Date().toISOString(),
    })
    const { error: upErr } = await admin
      .from('withdraw_requests')
      .update({ status: 'paid' })
      .eq('id', requestId)
    if (upErr) return json({ error: upErr.message }, 500)
    return json({ ok: true, status: 'paid', requestId, amountUsd: amount })
  }

  if (action === 'reject') {
    const { data: earn } = await admin
      .from('creator_earnings')
      .select('*')
      .eq('creator_id', creatorId)
      .maybeSingle()
    const available = Math.round(((Number(earn?.available_usd) || 0) + amount) * 100) / 100
    const pending = Math.max(0, Math.round(((Number(earn?.pending_usd) || 0) - amount) * 100) / 100)
    await admin.from('creator_earnings').upsert({
      creator_id: creatorId,
      available_usd: available,
      pending_usd: pending,
      lifetime_usd: Number(earn?.lifetime_usd) || 0,
      tips_usd: Number(earn?.tips_usd) || 0,
      subs_usd: Number(earn?.subs_usd) || 0,
      packs_usd: Number(earn?.packs_usd) || 0,
      updated_at: new Date().toISOString(),
    })
    const { error: upErr } = await admin
      .from('withdraw_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
    if (upErr) return json({ error: upErr.message }, 500)
    return json({ ok: true, status: 'rejected', requestId, amountUsd: amount })
  }

  return json({ error: 'Unknown action' }, 400)
})
