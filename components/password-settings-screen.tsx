'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import { initDB, getSettingByKey, setSetting } from '@/lib/db'
import { PasswordScreen } from '@/components/password-screen'

type PasswordState = 'idle' | 'set' | 'verify' | 'menu'

/**
 * "Kata sandi" settings screen (PRD-07 §2.1).
 * - If no PIN: set a new 4-digit PIN (with confirmation)
 * - If PIN active: verify PIN → menu (Matikan / Ubah kata sandi)
 */
export function PasswordSettingsScreen() {
  const [state, setState] = useState<PasswordState>('idle')
  const [status, setStatus] = useState<'Mati' | 'Aktif'>('Mati')

  const load = useCallback(async () => {
    await initDB()
    const setting = await getSettingByKey('app_pin')
    setStatus(setting?.ZDATA ? 'Aktif' : 'Mati')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSetPin = async (pin: string) => {
    await setSetting('app_pin', pin)
    setStatus('Aktif')
    setState('idle')
  }

  const handleDisablePin = async () => {
    await setSetting('app_pin', '')
    setStatus('Mati')
    setState('idle')
  }

  const handleChangePin = () => {
    setState('set')
  }

  const handleVerifySuccess = () => {
    setState('menu')
  }

  // Render PIN entry screens
  if (state === 'set') {
    return <PasswordScreen mode="set" onPinSet={handleSetPin} onCancel={() => setState('idle')} />
  }

  if (state === 'verify') {
    return (
      <PasswordScreen
        mode="verify"
        onPinVerified={handleVerifySuccess}
        onCancel={() => setState('idle')}
      />
    )
  }
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="password-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.nav.more}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.passcode.title}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:px-10 md:pb-8">
        <div className="rounded-xl border border-dashed px-3 py-3 text-xs text-pretty text-muted-foreground">
          <p>
            {t.passcode.helpText}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Lock className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{t.passcode.title}</p>
                <p className="text-xs text-muted-foreground">{status === 'Mati' ? t.passcode.off : t.passcode.on}</p>
              </div>
            </div>
            {status === 'Mati' ? (
              <Button onClick={() => setState('set')} data-testid="password-set">
                {t.passcode.turnOn}
              </Button>
            ) : (
              <Button onClick={() => setState('verify')} data-passwordid="password-manage">
                {t.passcode.change}
              </Button>
            )}
          </div>
        </div>

        {state === 'menu' && (
          <div className="rounded-xl border bg-card p-4 space-y-3" data-passwordid="password-menu">
            <p className="text-sm font-medium">Kata sandi aktif</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleChangePin} data-passwordid="password-change">
                Ubah kata sandi
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDisablePin} data-passwordid="password-disable">
                Matikan kata sandi
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
