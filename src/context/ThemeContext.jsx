import React, { createContext, useContext, useState, useEffect } from 'react'

export const ACCENTS = {
  purple: {
    id: 'purple',
    name: 'Neon Purple',
    brand: 'High contrast',
    primary: '#9146FF',
    primaryHover: '#772CE8',
    glow: 'rgba(145, 70, 255, 0.4)',
    badgeBg: 'rgba(145, 70, 255, 0.15)',
    badgeBorder: 'rgba(145, 70, 255, 0.3)',
    badgeText: '#A970FF',
    gradient: 'from-[#9146FF] to-[#6018c5]',
    bgGlow: 'rgba(145, 70, 255, 0.12)',
    cssVar: '145, 70, 255',
  },
  green: {
    id: 'green',
    name: 'Neon Green',
    brand: 'High contrast',
    primary: '#53FC18',
    primaryHover: '#42ca13',
    glow: 'rgba(83, 252, 24, 0.4)',
    badgeBg: 'rgba(83, 252, 24, 0.15)',
    badgeBorder: 'rgba(83, 252, 24, 0.35)',
    badgeText: '#53FC18',
    gradient: 'from-[#53FC18] to-[#27b000]',
    bgGlow: 'rgba(83, 252, 24, 0.12)',
    cssVar: '83, 252, 24',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyber Cyan',
    brand: 'Cyber Accent',
    primary: '#00E5FF',
    primaryHover: '#00b4d8',
    glow: 'rgba(0, 229, 255, 0.4)',
    badgeBg: 'rgba(0, 229, 255, 0.15)',
    badgeBorder: 'rgba(0, 229, 255, 0.35)',
    badgeText: '#00E5FF',
    gradient: 'from-[#00E5FF] to-[#0096c7]',
    bgGlow: 'rgba(0, 229, 255, 0.12)',
    cssVar: '0, 229, 255',
  },
  pink: {
    id: 'pink',
    name: 'Neon Pink',
    brand: 'Vapor Accent',
    primary: '#FF2E93',
    primaryHover: '#d81172',
    glow: 'rgba(255, 46, 147, 0.4)',
    badgeBg: 'rgba(255, 46, 147, 0.15)',
    badgeBorder: 'rgba(255, 46, 147, 0.35)',
    badgeText: '#FF54A8',
    gradient: 'from-[#FF2E93] to-[#c7005e]',
    bgGlow: 'rgba(255, 46, 147, 0.12)',
    cssVar: '255, 46, 147',
  },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [accentKey, setAccentKey] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('clips_theme_accent') || 'purple'
    }
    return 'purple'
  })

  const currentAccent = ACCENTS[accentKey] || ACCENTS.purple

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('clips_theme_accent', accentKey)
    }
    const root = document.documentElement
    root.style.setProperty('--color-accent-primary', currentAccent.primary)
    root.style.setProperty('--color-accent-hover', currentAccent.primaryHover)
    root.style.setProperty('--color-accent-glow', currentAccent.glow)
    root.style.setProperty('--color-accent-rgb', currentAccent.cssVar)
    root.setAttribute('data-accent', accentKey)
  }, [accentKey, currentAccent])

  const setAccent = (key) => {
    if (ACCENTS[key]) {
      setAccentKey(key)
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        accent: currentAccent,
        accentKey,
        setAccent,
        allAccents: ACCENTS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
