'use client'

import { AuthProvider } from '../src/context/AuthContext'

/** Root client providers — survive App Router navigations so auth does not remount. */
export default function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}
