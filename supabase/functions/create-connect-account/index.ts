/**
 * Stripe Connect Express — DISABLED (returns 501).
 * Use Studio → Earnings + Admin → Payouts instead (docs/OWN_PAYOUTS.md).
 */
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
  return json({
    error: 'connect_disabled',
    message: 'Stripe Express is off. Creators use Studio → Earnings; ops pays from Admin → Payouts (docs/OWN_PAYOUTS.md).',
    status: 'disabled',
  }, 501)
})
