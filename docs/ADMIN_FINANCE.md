# Admin Finance (master ledger)

Stripe-like view of **every settled card payment** on calabi.

## Who

Owner only (`kiddnixk` / `PLATFORM_OWNER_EMAILS`) via Edge Function `admin-finance`.

## Where

**Admin → Finance**

- KPIs: transaction count, gross volume, **platform fees** (master fee ledger), creator share, platform keep
- Search + kind filters
- Row click → investigate (list, fee, shares, payer, creator, content/order)
- Export CSV

## Money model

| Piece | Meaning |
|-------|---------|
| List | Product / tip / pack price |
| Platform fee | Buyer fee (4%) — platform-only |
| Gross | List + fee (charged on Stripe) |
| Creator share | 80% of **list** |
| Platform keep | Fee + 20% of list |

All charges land in the **platform Stripe account**. Creators withdraw from Studio → Earnings; ops pays from Admin → Payouts.

## Deploy

```bat
cd clips-app
npx supabase functions deploy admin-finance
```

Also keep deployed: `create-checkout-session`, `stripe-webhook`, `admin-withdraw`.

## Data

Rows come from `stripe_settlements` (written by `stripe-webhook`). Fee lives in `meta.platformFeeCents`.
