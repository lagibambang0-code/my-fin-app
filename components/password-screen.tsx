'use client'

import { useState } from 'react'
import { Delete, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PasswordMode = 'set' | 'verify'

type PasswordScreenProps = {
  mode: PasswordMode
  onPinSet?: (pin: string) => void
  onPinVerified?: () => void
  onCancel?: () => void
}

/**
 * PIN entry screen (PRD-07 §2.1). 4-digit PIN with:
 - "set" mode: enter PIN, then re-enter to confirm
 - "verify" mode: enter PIN, wrong PIN → error
 */
export function PasswordScreen({ mode, onPinSet, onPinVerified, onCancel }: PasswordScreenProps) {
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('Masukan kata sandi')
  const [error, setError] = useState<string | null>(null)

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setError(null)

    if (next.length === 4) {
      if (mode === 'set') {
        if (firstPin === null) {
          setFirstPin(next)
          setPrompt('Periksa kata sandi')
          setPin('')
        } else {
          if (next === firstPin) {
            onPinSet?.(next)
          } else {
            setError('Kata sandi tidak sama')
            setFirstPin(null)
            setPrompt('Masukan kata sandi')
            setPin('')
          }
        }
      } else {
        // verify mode — caller handles verification
        onPinVerified?.()
      }
    }
  }

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1))
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Kembali" data-testid="password-back" onClick={onCancel}>
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">
            {mode === 'set' ? 'Atur kata sandi' : 'Masukan kata sandi'}
          </h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <p className="text-sm text-muted-foreground" data-testid="password-prompt">{prompt}</p>

        {error && (
          <p role="alert" data-testid="password-error" className="text-sm text-destructive">{error}</p>
        )}

        {/* PIN indicators */}
        <div className="flex gap-3" data-testid="password-indicators">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                'size-4 rounded-full border-2 transition-colors',
                i < pin.length ? 'bg-primary border-primary' : 'border-muted-foreground/40',
              )}
            />
          ))}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3" data-testid="password-numpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key) => (
            <button
              key={key}
              type="button"
              disabled={key === ''}
              className={cn(
                'flex size-14 items-center justify-center rounded-full text-2xl font-medium transition-colors',
                key === '' ? 'invisible' : 'hover:bg-muted active:bg-muted',
              )}
              onClick={() => {
                if (key === '⌫') handleBackspace()
                else if (key) handleDigit(key)
              }}
            >
              {key === '⌫' ? <Delete className="size-6" /> : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
