'use client'

/**
 * Site-wide polite live region for ephemeral status (toast-style messages).
 * Call window.dispatchEvent(new CustomEvent('calabi-toast', { detail: { text } })).
 */
import { useEffect, useState } from 'react'

export default function ToastLiveRegion() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const onToast = (e) => {
      const text = String(e?.detail?.text || '').trim()
      if (!text) return
      setMessage(text)
      window.clearTimeout(onToast._t)
      onToast._t = window.setTimeout(() => setMessage(''), 4000)
    }
    window.addEventListener('calabi-toast', onToast)
    return () => {
      window.removeEventListener('calabi-toast', onToast)
      window.clearTimeout(onToast._t)
    }
  }, [])

  return (
    <div
      id="calabi-toast-region"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
