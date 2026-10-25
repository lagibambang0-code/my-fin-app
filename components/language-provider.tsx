'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  type SupportedLocale,
  type TranslationDictionary,
  TRANSLATIONS,
  getAppLanguage,
  setAppLanguage as persistAppLanguage,
} from '@/lib/i18n'

interface LanguageContextValue {
  language: SupportedLocale
  t: TranslationDictionary
  setLanguage: (locale: SupportedLocale) => Promise<void>
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  t: TRANSLATIONS.en,
  setLanguage: async () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLocaleState] = useState<SupportedLocale>('en')

  useEffect(() => {
    void (async () => {
      const active = await getAppLanguage()
      setLocaleState(active)
      if (typeof document !== 'undefined') {
        document.documentElement.lang = active
      }
    })()
  }, [])

  const setLanguage = useCallback(async (locale: SupportedLocale) => {
    setLocaleState(locale)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
    await persistAppLanguage(locale)
  }, [])

  const value: LanguageContextValue = {
    language,
    t: TRANSLATIONS[language] ?? TRANSLATIONS.en,
    setLanguage,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/** Hook to access current translation dictionary and language setter. */
export function useTranslation() {
  return useContext(LanguageContext)
}
