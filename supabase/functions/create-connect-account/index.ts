/**
 * Stripe Connect Express onboarding — free scaffolding.
 * Needs STRIPE_SECRET_KEY + Connect enabled on the Stripe account.
 * Without them, returns 501 so Revenue UI stays honest.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const appUrl = (Deno.env.get('APP_PUBLIC_URL') || Deno.env.get('SITE_URL') || 'https://calabi.us').replace(
      /\/$/,
      ''
    )

    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: 'not_configured',
          message: 'STRIPE_SECRET_KEY missing — enable Connect in Stripe Dashboard first',
        }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, email, display_name')
      .eq('id', user.id)
      .maybeSingle()

    let accountId = profile?.stripe_connect_account_id as string | undefined
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile?.email || user.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { user_id: user.id },
      })
      accountId = account.id
      await supabase
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id)
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/studio?tab=revenue&connect=refresh`,
      return_url: `${appUrl}/studio?tab=revenue&connect=return`,
      type: 'account_onboarding',
    })

    return new Response(JSON.stringify({ url: accountLink.url, accountId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
