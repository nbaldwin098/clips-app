# calabi MVP status

Honest snapshot of what ships for a usable MVP.

## Money (done)
- [x] Own Stripe Checkout (platform collects)
- [x] 4% Platform fee on every card charge (label + ? — no % shown)
- [x] Creator Earnings dashboard (methods + withdraw request)
- [x] Admin Payouts queue (mark paid / reject)
- [x] Admin Finance master ledger (fees + investigate every txn)
- [x] Webhook settles list/fee/creator share (no Express Transfers)

## Free infra (done in repo)
- [x] Full es/fr/pt/de UI translations (`i18n.js`)
- [x] VAPID public key in `.env.example` + push subscribe auth
- [x] MediaMTX + free Cloudflare Tunnel recipe
- [x] Social OAuth code path + free developer-app checklist (`docs/FREE_INFRA.md`)

## Deploy you must run
```bat
npx supabase functions deploy admin-finance
npx supabase functions deploy admin-withdraw
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy create-checkout-session
npx supabase functions deploy push-subscribe
```

## You still paste (free)
1. Render: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VITE_PUSH_SUBSCRIBE_URL` (your Supabase host + `/functions/v1/push-subscribe`)
2. Supabase secrets: `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT=mailto:info@calabigroup.com`
3. Optional: OAuth client IDs / MediaMTX on a home PC (`docs/FREE_INFRA.md`)

## Master fee account
There is no separate Stripe “fee account” — fees stay in the **platform Stripe balance**.
Track them in **Admin → Finance → Platform fees**.
