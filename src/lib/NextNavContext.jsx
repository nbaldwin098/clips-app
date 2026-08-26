'use client'

import { createContext, useContext } from 'react'

/** Provided by SpaShell (Next). Absent under legacy Vite → pushState fallback. */
export const NextNavContext = createContext(null)

export function useNextNav() {
  return useContext(NextNavContext)
}
