'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  type Currency,
  getMainCurrency,
  setMainCurrency as persistMainCurrency,
  initDB,
} from '@/lib/db'

export const CURRENCY_EVENT = 'dompetku:currency-changed'

interface CurrencyContextValue {
  currency: Currency | null
  setMainCurrency: (uid: string) => Promise<void>
  refreshCurrency: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: null,
  setMainCurrency: async () => {},
  refreshCurrency: async () => {},
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency | null>(null)

  const reload = useCallback(async () => {
    try {
      await initDB()
      const main = await getMainCurrency()
      if (main) setCurrency(main)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void reload()

    const onCurrencyChanged = (e: Event) => {
      const customEvent = e as CustomEvent<Currency>
      if (customEvent.detail) {
        setCurrency(customEvent.detail)
      } else {
        void reload()
      }
    }

    window.addEventListener(CURRENCY_EVENT, onCurrencyChanged)
    return () => window.removeEventListener(CURRENCY_EVENT, onCurrencyChanged)
  }, [reload])

  const setMainCurrency = useCallback(async (uid: string) => {
    await persistMainCurrency(uid)
    const main = await getMainCurrency()
    if (main) setCurrency(main)
  }, [])

  const value: CurrencyContextValue = {
    currency,
    setMainCurrency,
    refreshCurrency: reload,
  }

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
