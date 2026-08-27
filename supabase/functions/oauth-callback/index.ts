/**
 * OAuth callback stub — exchanges code → tokens when secrets exist.
 * Without client secret, redirects back to the app with error=not_configured.
 *
 * Env:
 *   *_CLIENT_SECRET / *_APP_SECRET / TIKTOK_CLIENT_SECRET
 *   APP_PUBLIC_URL
 *   OAUTH_TOKEN_URL_* (optional overrides)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TOKEN_ENDPOINTS: Record<string, { url: string; secretEnv: string; idEnv: string }> = {
  twitter: {
    url: 'https://api.twitter.com/2/oauth2/token',
    secretEnv: 'TWITTER_CLIENT_SECRET',
    idEnv: 'TWITTER_CLIENT_ID',
  },
  facebook: {
    url: 'https://graph.facebook.com/v18.0/oauth/access_token',
    secretEnv: 'FACEBOOK_APP_SECRET',
    idEnv: 'FACEBOOK_APP_ID',
  },
  instagram: {
    url: 'https://api.instagram.com/oauth/access_token',
    secretEnv: 'INSTAGRAM_APP_SECRET',
    idEnv: 'INSTAGRAM_APP_ID',
  },
  tiktok: {
    url: 'https://open.tiktokapis.com/v2/oauth/token/',
    secretEnv: 'TIKTOK_CLIENT_SECRET',
    idEnv: 'TIKTOK_CLIENT_KEY',
  },
  youtube: {
    url: 'https://oauth2.googleapis.com/token',
    secretEnv: 'YOUTUBE_CLIENT_SECRET',
    idEnv: 'YOUTUBE_CLIENT_ID',
  },
}

serve(async (req) => {
  const appUrl = (Deno.env.get('APP_PUBLIC_URL') || 'https://calabi.us').replace(/\/$/, '')
  const url = new URL(req.url)
  const provider = (url.searchParams.get('provider') || '').toLowerCase()
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  const fail = (reason: string) =>
    Response.redirect(`${appUrl}/studio?tab=socials&oauth_error=${encodeURIComponent(reason)}`, 302)

  if (error) return fail(error)
  if (!code || !provider || !TOKEN_ENDPOINTS[provider]) return fail('missing_code')

  const cfg = TOKEN_ENDPOINTS[provider]
  const clientId = Deno.env.get(cfg.idEnv)
  const clientSecret = Deno.env.get(cfg.secretEnv)
  const redirectBase = Deno.env.get('OAUTH_REDIRECT_BASE')
  if (!clientId || !clientSecret || !redirectBase) return fail('not_configured')

  try {
    const redirectUri = `${redirectBase.replace(/\/$/, '')}?provider=${provider}`
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    })
    const tokenRes = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    })
    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      console.error('oauth token error', provider, text)
      return fail('token_exchange_failed')
    }
    // Persist tokens in your DB here when ready (service role).
    // For now redirect success so Studio Socials can show connected state via localStorage.
    return Response.redirect(
      `${appUrl}/studio?tab=socials&oauth_ok=${encodeURIComponent(provider)}`,
      302
    )
  } catch (e) {
    console.error(e)
    return fail('exception')
  }
})
