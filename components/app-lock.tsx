'use client'

import { useCallback, useEffect, useState } from 'react'
import { initDB, getSettingByKey } from '@/lib/db'
import { PasswordScreen } from '@/components/password-screen'

/**
 * AppLock — wraps the app content and shows a PIN lock screen when a PIN
 * has been set (PRD-07 §2.1). The user must enter the correct PIN to access
 * the app.
 */
export function AppLock({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkPin = useCallback(async () => {
    await initDB()
    const setting = await getSettingByKey('app_pin')
    if (setting?.ZDATA) {
      setLocked(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    checkPin()
  }, [checkPin])

  const handleVerified = () => {
    setLocked(false)
  }

  if (loading) return null

  if (locked) {
    return <PasswordScreen mode="verify" onPinVerified={handleVerified} onCancel={() => {}} />
  }

  return <>{children}</>
}
