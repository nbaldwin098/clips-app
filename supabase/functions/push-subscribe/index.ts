/**
 * Optional push-subscribe storage — free scaffold.
 * Deploy with: supabase functions deploy push-subscribe
 * Secrets: none required for local-store mode; add DB later.
 *
 * Client posts { subscription } from webPush.enableWebPush when
 * VITE_PUSH_SUBSCRIBE_URL points here.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const subscription = body?.subscription
    if (!subscription?.endpoint) {
      return new Response(JSON.stringify({ error: 'subscription.endpoint required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    if (authHeader && supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey)
      const token = authHeader.replace('Bearer ', '')
      const { data } = await supabase.auth.getUser(token)
      userId = data?.user?.id || null
      // Best-effort persist when a push_subscriptions table exists
      if (userId) {
        try {
          await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            endpoint: subscription.endpoint,
            subscription,
            updated_at: new Date().toISOString(),
          })
        } catch {
          console.warn('push_subscriptions table missing — subscription accepted in memory only')
        }
      }
    }

    console.log('push subscribe', { userId, endpoint: subscription.endpoint?.slice(0, 48) })
    return new Response(JSON.stringify({ ok: true, stored: !!userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
