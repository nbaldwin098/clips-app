# Free infra finish — what we did in-repo vs one paste from you

Everything below is **$0**. Some steps need your Google/Cloudflare/Supabase login (we can’t log into your accounts).

---

## 1. Web Push (done in code + keys generated)

**In repo**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set in `.env.example`
- Client registers `/sw-push.js` and posts to `push-subscribe` with auth
- Notifications settings UI already wired

**You paste once (free)**

1. Render env:
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=BJlrL7-tTYqdyhqVUvA7HIHAyarYn4e1LP9DiREoEnhbK6Esc659XR4dJww4H4NzIm3O33_u6vgddJcRK9ES0H4
   VITE_PUSH_SUBSCRIBE_URL=https://YOUR_PROJECT.supabase.co/functions/v1/push-subscribe
   ```
2. Supabase → Edge Functions → Secrets:
   ```
   VAPID_PRIVATE_KEY=<paste private key from agent — never commit>
   VAPID_SUBJECT=mailto:kiddnixk@gmail.com
   ```
3. Deploy:
   ```bat
   npx supabase functions deploy push-subscribe
   ```

---

## 2. Full translations (done — free)

`src/lib/i18n.js` now has **complete** catalogs for **en / es / fr / pt / de** (same keys).  
Account → Language switches core UI labels. Help/legal pages can stay English.

---

## 3. RTMP live (free path)

**Without paying for a VPS**

| Option | Cost | Notes |
|--------|------|--------|
| Browser **window share** | $0 | Already live — no RTMP |
| MediaMTX on a **PC at home** + **Cloudflare Tunnel** | $0 | Public HTTPS HLS without buying a VPS |
| Cheap VPS later | ~$4–6/mo | Optional upgrade |

**Home lab (free tunnel)**

```bat
cd clips-app\docker\mediamtx
docker compose up -d
```

Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) (free), then:

```bat
cloudflared tunnel --url http://127.0.0.1:8888
```

Copy the `https://….trycloudflare.com` URL into Render:

```
VITE_LIVE_RTMP_URL=rtmp://YOUR_PUBLIC_IP:1935/live
VITE_LIVE_HLS_BASE=https://YOUR_TRYCLOUDFLARE_HOST/live
VITE_LIVE_INGEST_CONNECTED=true
```

OBS still needs a reachable RTMP host (home IP + port forward **1935**, or a free tunnel that supports TCP — many people use window share until they have a VPS).

See also `docs/mediamtx.md`.

---

## 4. Social OAuth (code ready — free developer apps)

We **cannot** create YouTube/TikTok/X apps for you (needs your login). Code + Edge stubs are ready.

**Free registration (you click, $0):**

| Network | Where |
|---------|--------|
| YouTube | Google Cloud Console → OAuth client |
| TikTok | developers.tiktok.com |
| X | developer.x.com |
| Facebook/Instagram | developers.facebook.com |

Then set Render `VITE_OAUTH_*_CLIENT_ID` + Edge secrets +:

```bat
npx supabase functions deploy oauth-start
npx supabase functions deploy oauth-callback
```

Until then: Studio → Socials saves **handles** for profile only (honest — no fake publish).

---

## Deploy checklist (Windows)

```bat
cd C:\Users\A6237\clips-app
git pull
npx supabase functions deploy push-subscribe
npx supabase functions deploy oauth-start
npx supabase functions deploy oauth-callback
```

Add the VAPID public key on **Render**, private key on **Supabase secrets**.
