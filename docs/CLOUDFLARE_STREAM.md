# Cloudflare Stream live (Calabi)

This is the production ingest path. Window share still works if Stream is not configured.

Do **not** set `VITE_LIVE_INGEST_CONNECTED=true`. Connected is true only after the Edge Function returns a real RTMPS key + HLS URL for that creator.

## You do once

1. Cloudflare dashboard → Stream (paid add-on) → enable.
2. Create an API token with **Account → Stream → Edit**.
3. Account ID: right sidebar of the Cloudflare dashboard.
4. Supabase → Edge secrets:

```
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
```

Optional (prettier playback host):

```
CLOUDFLARE_STREAM_CUSTOMER=customer-xxxxxxxx
```

(From any Stream playback URL: `customer-….cloudflarestream.com`.)

5. SQL editor: run `supabase/migrations/0025_cloudflare_live_inputs.sql`.

6. Deploy:

```bash
npx supabase functions deploy live-ingest
```

## What the app does

- Studio → Stream settings calls `live-ingest`.
- Cloudflare creates one **live input** per user (reused after that).
- OBS: Server = `rtmps://live.cloudflare.com:443/live/` · Key = Stream key.
- Go Live publishes that creator’s HLS URL to the lobby.
- Recordings auto-delete after **3 days** to keep the $5/1k stored-min bill down.

## Test

1. Sign in → Studio → Stream. Server + key must appear (not “not configured”).
2. OBS Custom RTMPS → Start Streaming.
3. Phone on cellular opens the HLS URL from that page.
4. Then Go Live so viewers use the same URL.

If step 1 says `cloudflare_not_configured`, the two Edge secrets are missing.
