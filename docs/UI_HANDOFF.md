# Clips — UI handoff

Backend/data contracts the UI should call. Swap local implementations for HTTP later without rewriting screens.

## Auth

| UI need | Today | Future API |
|--------|--------|------------|
| Sign in / up | `AuthModal` + `useAuth().login` | `POST /auth/login`, `POST /auth/signup`, Apple |
| Session | `useAuth().user`, `isAuthenticated` | JWT / Supabase session |
| Watch logged out | Allowed | Same |
| Upload / Import / comment / live | Require auth (App gates import/upload) | Same |

Fields: **Name** (signup), **Email**, **Password**, **Continue with Apple**. Not "username".

## Content service (`src/lib/contentService.js`)

```js
getHomeFeed(userId?)      // legal seeds + imports, ranked
getShortsFeed(userId?)
getExplore(query?)
getById(id)
listLegalLibrary(filters?)
importUserLink(url, opts?) // social OR legal library URL
listImportsNormalized()
recordView(id)
```

### ContentItem shape

```ts
{
  id: string
  type: 'short' | 'video'
  title: string
  description: string
  sourceUrl: string
  mediaUrl: string
  thumbUrl?: string
  origin: string
  license?: string
  attribution?: string
  isSeed?: boolean
  storedBytes: number
  durationSec?: number
  tags: string[]
  views: number
  engagement: object
  createdAt: string
  crossPost?: object
}
```

## Legal seed policy

- Only PD / US Gov / CC0 / CC BY / CC BY-SA
- Sources: NASA, USGS, Wikimedia Commons, Internet Archive PD
- Never scrape TikTok/YouTube/IG binaries
- Attribution always visible on seed cards

## Theme

- ~99% white, powder blue `#2C729B`
- lucide icons only

## Free-tier target

Supabase free + R2 free + static host. Default = link import (metadata only).
