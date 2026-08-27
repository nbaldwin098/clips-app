/**
 * OAuth start stub — free scaffolding for social connect.
 *
 * Env (per-provider):
 *   TWITTER_CLIENT_ID / FACEBOOK_APP_ID / INSTAGRAM_APP_ID / TIKTOK_CLIENT_KEY / YOUTUBE_CLIENT_ID
 *   OAUTH_REDIRECT_BASE  (e.g. https://xxx.supabase.co/functions/v1/oauth-callback)
 *   APP_PUBLIC_URL       (e.g. https://calabi.us)
 *
 * Without the matching client id, returns 501 so the app can show "not configured".
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROVIDERS: Record<
  string,
  { authorizeUrl: string; clientIdEnv: string; scope: string }
> = {
  twitter: {
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    clientIdEnv: 'TWITTER_CLIENT_ID',
    scope: 'tweet.read users.read offline.access',
  },
  facebook: {
    authorizeUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientIdEnv: 'FACEBOOK_APP_ID',
    scope: 'pages_show_list,pages_read_engagement',
  },
  instagram: {
    authorizeUrl: 'https://api.instagram.com/oauth/authorize',
    clientIdEnv: 'INSTAGRAM_APP_ID',
    scope: 'user_profile,user_media',
  },
  tiktok: {
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    scope: 'user.info.basic',
  },
  youtube: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const provider = (url.searchParams.get('provider') || '').toLowerCase()
    const state = url.searchParams.get('state') || crypto.randomUUID()
    const cfg = PROVIDERS[provider]
    if (!cfg) {
      return new Response(JSON.stringify({ error: 'Unknown provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clientId = Deno.env.get(cfg.clientIdEnv)
    const redirectBase = Deno.env.get('OAUTH_REDIRECT_BASE')
    if (!clientId || !redirectBase) {
      return new Response(
        JSON.stringify({
          error: 'not_configured',
          message: `${cfg.clientIdEnv} or OAUTH_REDIRECT_BASE not set`,
          provider,
        }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const redirectUri = `${redirectBase.replace(/\/$/, '')}?provider=${provider}`
    const auth = new URL(cfg.authorizeUrl)
    auth.searchParams.set('client_id', clientId)
    auth.searchParams.set('redirect_uri', redirectUri)
    auth.searchParams.set('response_type', 'code')
    auth.searchParams.set('scope', cfg.scope)
    auth.searchParams.set('state', state)
    if (provider === 'youtube') {
      auth.searchParams.set('access_type', 'offline')
      auth.searchParams.set('prompt', 'consent')
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: auth.toString() },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
