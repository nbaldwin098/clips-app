# Own payouts (no Stripe Express)

Buyers still pay with **calabi’s Stripe Checkout Session** (platform account + 4% Platform fee).
Creators **do not** onboard to Stripe Express.

## Creator path

1. Studio → **Earnings**
2. Save PayPal / Venmo / Cash App / bank / crypto
3. Request withdrawal (min $10)
4. Balance moves Available → Pending until ops pays

## Ops path

1. Admin → **Payouts** → Pending withdrawals
2. Send money with the shown destination
3. **Mark paid** (or **Reject** to restore Available)

Edge Function: `admin-withdraw`  
Deploy: `supabase functions deploy admin-withdraw`

## Finance (master ledger)

Every card charge + platform fee: **Admin → Finance** (`docs/ADMIN_FINANCE.md`).  
Deploy: `supabase functions deploy admin-finance`

Optional secret: `PLATFORM_OWNER_EMAILS=kiddnixk@gmail.com`

## Webhook

`stripe-webhook` credits `creator_earnings.available_usd` (80% of list).  
**No** Connect Transfers. Settlement `transfer_status` = `manual`.

## Related

- Buyer checkout: `docs/OWN_CHECKOUT.md`
- Legacy Connect notes: `docs/OWN_CONNECT.md` (Express off)
