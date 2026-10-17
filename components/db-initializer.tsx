'use client'

import { useEffect } from 'react'
import { initDB } from '@/lib/db'

export function DbInitializer() {
  useEffect(() => {
    initDB().catch((err) => {
      console.error('Failed to initialize database:', err)
    })
  }, [])

  return null
}
