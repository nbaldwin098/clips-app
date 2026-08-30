# Calabi — complete product map (deploy checklist)

The product is **calabi**. **Clips** is the short-form format (route `/clips`, Storage bucket `clips`) — those identifiers stay.

## Public pages (no login)

| View id | Screen | Primary actions |
|---------|--------|-----------------|
| home | HomeFeed | Legal library, Import, Studio |
| shorts | ShortsFeed | Grid, Import |
| live | LiveView | Empty + Stream settings |
| explore | ExplorePage | Search, origin chips |
| history / liked / watch-later / library | LibraryPage | Tabs |
| help | HelpPage | FAQ |
| about | AboutPage | Principles |
| legal-* | Legal pages | Footer |
| (unknown) | NotFoundPage | Home / Explore |

## Auth-gated

| View / modal | Gate |
|--------------|------|
| Import / Upload modals | Sign in |
| dashboard / wallet | AuthRequired |
| settings | Profile / security / stream / monetization |
| messages / admin | Auth + role gates |

## Stripe

- Publishable: Render `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` or `VITE_STRIPE_PUBLISHABLE_KEY`
- Secret: Supabase Edge Function `STRIPE_SECRET_KEY` only
- Never commit `sk_` keys; do not use Payment Links

## Render (production)

- **Node web service** (not Static Site) — required for App Router SSR / SEO
- Build: `npm install && npm run build`
- Start: `npm run start`
- Blueprint: `render.yaml`
- Env: see [`docs/RENDER_ENV.md`](RENDER_ENV.md)
- Deploy steps: [`docs/DEPLOY_CHECKLIST.md`](DEPLOY_CHECKLIST.md)
