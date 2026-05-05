'use client'

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'ossa' | 'mastech'

const STORAGE_KEY = 'ossa-theme'

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('ossa')

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'ossa'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'ossa' ? 'mastech' : 'ossa'
      localStorage.setItem(STORAGE_KEY, next)
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggle }
}
