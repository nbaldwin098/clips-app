import { createContext, useContext } from 'react'

const DashToneContext = createContext('dark')

export function DashToneProvider({ tone = 'dark', children }) {
  return <DashToneContext.Provider value={tone === 'light' ? 'light' : 'dark'}>{children}</DashToneContext.Provider>
}

export function useDashTone() {
  return useContext(DashToneContext)
}
