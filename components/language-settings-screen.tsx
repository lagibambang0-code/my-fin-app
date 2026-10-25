'use client'

import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  type SupportedLocale,
  SUPPORTED_LANGUAGES,
} from '@/lib/i18n'
import { useTranslation } from '@/components/language-provider'
export function LanguageSettingsScreen() {
  const router = useRouter()
  const { language, setLanguage, t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col" data-testid="language-settings-screen">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="language-settings-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.nav.more}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.languageScreen.title}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 md:px-10">
        <div className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-3 text-xs text-muted-foreground">
          <Globe className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p>{t.languageScreen.subtitle}</p>
        </div>

        <div className="rounded-2xl border bg-card divide-y">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              data-testid={`language-option-${lang.code}`}
              onClick={() => void setLanguage(lang.code)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-secondary"
            >
              <div>
                <span className="block text-sm font-medium">{lang.name}</span>
                <span className="block text-xs text-muted-foreground">{lang.translator}</span>
              </div>
              {language === lang.code && (
                <Check className="size-4 text-primary" data-testid="language-selected-check" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
