# Render / Node + Supabase env (calabi.us)

Do not put Stripe secrets, webhook secrets, or VAPID private keys on Render. Those belong in **Supabase Edge Function secrets**.

## Render (browser / Next build)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Cloud catalog, auth, storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | checkout | Stripe.js (`pk_…`) |
| `VITE_ADMIN_CODE` | admin unlock | No default in app |
| `VITE_PLATFORM_OWNER_ID` | owner admin | Your Supabase Auth user UUID |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push | Public VAPID only |
| `VITE_PUSH_SUBSCRIBE_URL` | push | `https://<project>.supabase.co/functions/v1/push-subscribe` |

Legacy aliases still work if the `NEXT_PUBLIC_*` pair is unset: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`.

After changing any `NEXT_PUBLIC_*` or `VITE_*` value, **redeploy** the Node service so the client bundle picks it up.

## Supabase Edge Function secrets (server only)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Checkout sessions (`sk_…`) |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhooks (`whsec_…`) |
| `VAPID_PRIVATE_KEY` | Web Push |
| `VAPID_SUBJECT` | e.g. `mailto:info@calabigroup.com` |
| `APP_PUBLIC_URL` | `https://calabi.us` |

Deploy functions (from a machine with the Supabase CLI logged in):

```bash
npx supabase functions deploy create-checkout-session
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy admin-withdraw
npx supabase functions deploy admin-finance
npx supabase functions deploy push-subscribe
```

## Must not set unless true

- `VITE_LIVE_INGEST_CONNECTED` — only after RTMP/HLS plays on a second device
- `VITE_STRIPE_PAYMENT_LINK` — unused; own Checkout Session only
- Any `sk_`, `whsec_`, or VAPID private key on Render

## Health

`GET https://calabi.us/api/health`

- `200` when Supabase URL + anon are present
- Body reports presence flags only (no secret values)
- `liveIngestFlagOn` must stay `false` until real ingest exists

Related: `docs/DEPLOY_CHECKLIST.md`, `docs/INFRA.md`, `docs/OWN_PAYOUTS.md`, `docs/OWN_CHECKOUT.md`.
