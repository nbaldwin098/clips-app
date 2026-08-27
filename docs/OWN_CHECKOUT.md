# Own Stripe Checkout (no Payment Links)

## What you already have
- `STRIPE_SECRET_KEY` in Supabase → Edge Functions → Secrets
- Hosted Checkout Sessions from `create-checkout-session` (tips, Coin packs, shop)

## Deploy the function

From a machine with [Supabase CLI](https://supabase.com/docs/guides/cli) logged into your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy create-checkout-session
```

Confirm secret name is exactly:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

(or set it in the Dashboard → Edge Functions → Secrets)

Optional:

```bash
supabase secrets set SITE_URL=https://calabi.us
```

## Render (frontend — Node service)

You still need:

- `NEXT_PUBLIC_SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`)
- Optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` (not required for hosted Checkout Sessions)

Do **not** set `VITE_STRIPE_PAYMENT_LINK`.

Full list: [`docs/RENDER_ENV.md`](RENDER_ENV.md). Incident steps: [`docs/RUNBOOK_STRIPE_WEBHOOK.md`](RUNBOOK_STRIPE_WEBHOOK.md).

## Auth note
Checkout requires a **signed-in cloud user** (email is fine). The Edge Function rejects requests without a Supabase JWT.

## Platform fee (buyer-facing)

Every card checkout adds a **Platform fee** on top of the list price (tips, Coin packs, shop, paid posts).

- Rate: **4%** of item (+ shipping when applicable) — internal only; **UI never shows the percentage**.
- Buyer label: **Platform fee**
- Explainer (blue ?): **Platform and fraud protection**
- Creator **80%** share is of the **list price only** (not of the fee). The fee is platform revenue.

Client helpers: `src/lib/platformFee.js`, `src/components/PlatformFeeLine.jsx`. Edge Function adds the fee once on session create.

## Test
1. Sign in on calabi.us  
2. Open Coins → buy a pack, or tip $2 / buy a shop item  
3. You should land on Stripe’s hosted checkout page (line items include Platform fee when applicable)  
4. After pay, return to `/checkout?paid=1&session_id=...` and the pending action applies  

## Stripe Dashboard
- Use **test** mode keys first (`sk_test_` / `pk_test_`)  
- Enable card payments  
- Later switch to live keys and redeploy secrets  
- Live mode: confirm the same Edge Function secret is `sk_live_…` and Render redeployed
