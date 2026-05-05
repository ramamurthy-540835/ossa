'use client'

import { useState, useEffect, useCallback } from 'react'
import { ComplianceDetail } from '../providers.config'

const STORAGE_KEY = 'ossa_custom_compliance'

export function useCustomCompliance() {
  const [custom, setCustom] = useState<Record<string, ComplianceDetail>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setCustom(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const add = useCallback((detail: ComplianceDetail) => {
    setCustom(prev => {
      const next = { ...prev, [detail.id]: detail }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setCustom(prev => {
      const next = { ...prev }
      delete next[id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { custom, add, remove }
}
