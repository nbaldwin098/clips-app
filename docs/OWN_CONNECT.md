# Own Stripe Connect (creator auto-payouts)

Tips / premium / paid posts charge the **platform** Stripe account (Checkout).
Creators get **80%** via Stripe Connect Express Transfers when they finish onboarding.
Until Connect is live, creators still save a manual payout contact (PayPal / Venmo / Cash App).

## What is already in the repo

| Piece | Path |
|-------|------|
| Onboard + status Edge Function | `supabase/functions/create-connect-account` |
| Webhook (settle + Transfer + `account.updated`) | `supabase/functions/stripe-webhook` |
| Client helpers | `src/lib/stripeConnect.js` |
| Revenue UI | Settings → Revenue |
| SQL | `supabase/migrations/0023_*.sql` + `0024_stripe_connect.sql` |
| Split | `src/lib/revenueSplit.js` (`CREATOR_REV_SHARE = 0.8`) |

## One-time setup (you)

### 1. Enable Connect in Stripe
1. [Stripe Dashboard → Connect](https://dashboard.stripe.com/connect) → Get started / Settings.
2. Choose **Express** accounts.
3. Complete platform profile (country, business details).

### 2. Deploy Edge Functions
```bash
supabase functions deploy create-connect-account
supabase functions deploy stripe-webhook --no-verify-jwt
```

### 3. Secrets (Supabase → Edge Functions → Secrets)
| Secret | Value |
|--------|--------|
| `STRIPE_SECRET_KEY` | `sk_test_…` or `sk_live_…` (same as Checkout) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint below |
| `APP_PUBLIC_URL` or `SITE_URL` | `https://calabi.us` |

### 4. Webhook endpoint
Stripe → Developers → Webhooks → Add endpoint:

```
https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
```

Events (Accounts v2 Event Destination — what Stripe shows you):
- `payment_intent.succeeded`  ← under Subscriptions list
- `v2.core.account.updated`   ← under Accounts v2 list

Same webhook URL for **Your account** scope.

### 5. Run SQL
Admin → Setup → run **0023** (if not yet) then **0024** (Connect columns + settlement tables).

### 6. Smoke test
1. Approved creator → Settings → Revenue → **Connect Stripe** → finish Express onboarding.
2. Status should become **Payouts enabled**.
3. Another user tips them $5 → webhook credits earnings and creates a Transfer for $4.00 (80%).
4. If the creator has not finished Connect, the $4 stays in `creator_earnings.available_usd` for manual payout.

## Behavior (honest)

- **Coins packs** — buyer credit only; no creator Transfer.
- **Tips / premium / paid posts** — 80% creator / 20% platform; Transfer when `payouts_enabled`.
- **Client return URL** (`claimStripeReturn`) still unlocks UX (chat tip, local coin credit). **Money movement** for creators is webhook-owned.
- Do not set `VITE_STRIPE_PAYMENT_LINK` — own Checkout only.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Button says function missing | Deploy `create-connect-account` |
| `Connect is not enabled` | Stripe Dashboard Connect onboarding |
| Tip paid, no Transfer | Creator Connect status; `stripe_settlements.transfer_status`; webhook deliveries |
| Double credit | Settlements keyed by `session_id` — should no-op on retry |

See also: `docs/OWN_CHECKOUT.md`, `docs/INFRA.md`, `docs/RUNBOOK_STRIPE_WEBHOOK.md`.
