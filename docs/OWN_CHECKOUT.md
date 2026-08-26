# Own Stripe Checkout (no Payment Links)

## What you already have
- `STRIPE_SECRET_KEY` in Supabase → Edge Functions → Secrets

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

## Render (frontend)
You still need:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Optional: `VITE_STRIPE_PUBLISHABLE_KEY` (not required for hosted Checkout Sessions)

Do **not** set `VITE_STRIPE_PAYMENT_LINK`.

## Auth note
Checkout requires a **signed-in cloud user** (email is fine). The Edge Function rejects requests without a Supabase JWT.

## Test
1. Sign in on calabi.us  
2. Open Checkout / tip $2 / buy a shop item  
3. You should land on Stripe’s hosted checkout page  
4. After pay, return to `/checkout?paid=1&session_id=...` and the pending action applies  

## Stripe Dashboard
- Use **test** mode keys first (`sk_test_` / `pk_test_`)  
- Enable card payments  
- Later switch to live keys and redeploy secrets  
