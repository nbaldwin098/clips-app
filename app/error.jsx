'use client'

/**
 * Segment error UI for App Router pages.
 */
export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black text-zinc-100">
      <div className="max-w-md w-full text-center border border-zinc-800 bg-[#121218] p-8">
        <h1 className="text-lg font-semibold">Page error</h1>
        <p className="mt-2 text-sm text-zinc-500 break-words">
          {error?.message || 'Something went wrong loading this page.'}
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
  )
}
