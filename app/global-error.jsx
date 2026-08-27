'use client'

import { useEffect } from 'react'

/**
 * Next.js App Router client error UI.
 * Replaces the generic "Application error: a client-side exception has occurred"
 * with a recoverable screen (and one auto-reload for stale deploy chunks).
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('calabi global error', error)
    const msg = String(error?.message || '')
    if (
      /Loading chunk|dynamically imported module|ChunkLoadError/i.test(msg)
      && typeof window !== 'undefined'
    ) {
      try {
        if (!sessionStorage.getItem('calabi_chunk_reload')) {
          sessionStorage.setItem('calabi_chunk_reload', '1')
          window.location.reload()
        }
      } catch { /* ignore */ }
    }
  }, [error])

  return (
    <html lang="en">
      <body className="bg-black text-zinc-100 antialiased">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center border border-zinc-800 bg-[#121218] p-8">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-zinc-500 break-words">
              {error?.message || 'A client-side exception occurred.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => reset?.()}
                className="h-10 px-5 bg-white text-black text-sm font-medium"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/' }}
                className="h-10 px-5 border border-zinc-700 text-zinc-300 text-sm font-medium"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
