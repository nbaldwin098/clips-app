# How backend works for Clips (free path)

## Content model (what users do)

**Default: link import (recommended)**  
User pastes TikTok / YouTube Shorts / Instagram / Twitch / Kick URL.  
We store: title metadata, platform, source URL, cross-post flag.  
We do **not** download the video file.  
→ Cheap, fast, not too much for creators.

**Optional: file upload**  
Only when they want a copy on Clips. Client compresses toward 720p first.  
→ Use sparingly.

**We do not** scrape or rehost without rights.

## Backend stack (free)

| Piece | Free option |
|-------|-------------|
| Auth + DB | Supabase free |
| Stripe secret | Edge Function env STRIPE_SECRET_KEY |
| Publishable | Render VITE_STRIPE_PUBLISHABLE_KEY |
| Owned media | R2 / B2 later |
| Live | MediaMTX later |

## Order

1. Static + pk (now)
2. Supabase Auth
3. Checkout with sk_
4. Live when demanded
