# calabi MVP status

Honest snapshot of what ships for a usable MVP.

## Money (done)
- [x] Own Stripe Checkout (platform collects)
- [x] 4% Platform fee on every card charge
- [x] Creator Earnings dashboard + Admin Payouts
- [x] Admin Finance ledger (see PR #167 if not merged yet)

## Free infra (this branch)
- [x] Full es/fr/pt/de UI translations (`i18n.js`)
- [x] VAPID public key in `.env.example` + push subscribe auth
- [x] MediaMTX + free Cloudflare Tunnel recipe
- [x] Social OAuth code path + free developer-app checklist (`docs/FREE_INFRA.md`)

## You still paste (free, your logins)
1. Render: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VITE_PUSH_SUBSCRIBE_URL`
2. Supabase secret: `VAPID_PRIVATE_KEY`
3. `npx supabase functions deploy push-subscribe`
4. Optional: OAuth client IDs / MediaMTX on a home PC
