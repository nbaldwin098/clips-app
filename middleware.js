import { NextResponse } from 'next/server'
import { looksLikeContentId } from './src/lib/publicId.js'

/** Rewrite bare /{contentId} → /content/{id} so App Router can attach SEO metadata. */
export function middleware(request) {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean)
  if (parts.length === 1 && looksLikeContentId(parts[0])) {
    const url = request.nextUrl.clone()
    url.pathname = `/content/${parts[0]}`
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
