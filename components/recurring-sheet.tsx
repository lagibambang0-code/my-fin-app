'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, Check, ChevronLeft, Layers, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Numpad, applyNumpadKey, type NumpadKey } from '@/components/ui/numpad'
import { FullScreenSheet, Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import { formatAmount } from '@/lib/format'
import { RECUR_FREQUENCIES } from '@/lib/transaction-utils'

export type RecurringValue = {
  recurType: 'repeat' | 'installment' | null
  recurFreq: number | null
  installmentMonths: number | null
}

type RecurringSheetProps = {
  open: boolean
  value: RecurringValue
  onChange: (value: RecurringValue) => void
  onClose: () => void
}

const CLEAR: RecurringValue = { recurType: null, recurFreq: null, installmentMonths: null }

/** "Berulang/cicil" picker: Ulang (14 frequencies) or Cicil (monthly input). */
export function RecurringSheet({ open, value, onChange, onClose }: RecurringSheetProps) {
  const [stage, setStage] = useState<'menu' | 'repeat' | 'installment'>('menu')
  const [raw, setRaw] = useState('')

  useEffect(() => {
    if (!open) return
    setStage('menu')
    setRaw(value.installmentMonths ? String(value.installmentMonths) : '')
  }, [open, value.installmentMonths])

  const handleKey = (key: NumpadKey) => {
    setRaw((current) => {
      const next = applyNumpadKey(current, key, 0)
      return next.length > 3 ? current : next
    })
  }

  if (!open) return null

  return (
    <>
      <Overlay
        open={stage !== 'installment'}
        onClose={onClose}
        align="bottom"
        testId="recurring-sheet"
        label="Berulang/cicil"
      >
        <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-0">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-base font-bold">Berulang/cicil</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          {stage === 'menu' ? (
            <div className="max-h-[70vh] overflow-y-auto p-2">
              <button
                type="button"
                data-testid="recurring-menu-repeat"
                onClick={() => setStage('repeat')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <CalendarClock aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Ulang</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {value.recurType === 'repeat' && value.recurFreq !== null
                      ? RECUR_FREQUENCIES[value.recurFreq]
                      : 'Ulangi transaksi secara berkala'}
                  </span>
                </span>
              </button>

              <button
                type="button"
                data-testid="recurring-menu-installment"
                onClick={() => setStage('installment')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Layers aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Cicil</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {value.recurType === 'installment' && value.installmentMonths
                      ? `Cicilan ${value.installmentMonths} bulan`
                      : 'Bagi transaksi menjadi cicilan bulanan'}
                  </span>
                </span>
              </button>

              {value.recurType && (
                <button
                  type="button"
                  data-testid="recurring-menu-clear"
                  onClick={() => {
                    onChange(CLEAR)
                    onClose()
                  }}
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X aria-hidden="true" className="size-4" />
                  Hapus pengaturan berulang
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Kembali"
                  onClick={() => setStage('menu')}
                >
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </Button>
                <p className="text-sm font-semibold">Ulang</p>
              </div>
              <ul className="max-h-[60vh] overflow-y-auto p-2">
                {RECUR_FREQUENCIES.map((label, index) => {
                  const isSelected = value.recurType === 'repeat' && value.recurFreq === index
                  return (
                    <li key={label}>
                      <button
                        type="button"
                        data-testid={`recurring-option-${index}`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          onChange({
                            recurType: index === 0 ? null : 'repeat',
                            recurFreq: index === 0 ? null : index,
                            installmentMonths: null,
                          })
                          onClose()
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected && 'bg-accent text-accent-foreground',
                        )}
                      >
                        <span>{label}</span>
                        {isSelected && <Check aria-hidden="true" className="size-4 text-primary" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </Overlay>

      <FullScreenSheet open={stage === 'installment'} onClose={() => setStage('menu')} testId="installment-screen" variant="drawer">
        <header className="flex items-center gap-2 border-b px-3 py-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            onClick={() => setStage('menu')}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Cicil</h1>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <p className="text-sm text-muted-foreground">Input cicilan bulanan</p>
            <dl className="mt-3 rounded-2xl border bg-card p-4">
              <dt className="text-xs text-muted-foreground">Jumlah bulan</dt>
              <dd
                className="mt-1 text-3xl font-bold tabular-nums"
                data-testid="installment-months-value"
              >
                {formatAmount(Number(raw || '0'))}
              </dd>
            </dl>
          </div>

          <div className="border-t bg-card/75 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
            <Numpad onKey={handleKey} decimals={0} />
            <Button
              type="button"
              className="mt-3 h-11 w-full"
              data-testid="installment-save"
              disabled={!(Number(raw) > 0)}
              onClick={() => {
                onChange({
                  recurType: 'installment',
                  recurFreq: null,
                  installmentMonths: Number(raw),
                })
                onClose()
              }}
            >
              Simpan
            </Button>
          </div>
        </div>
      </FullScreenSheet>
    </>
  )
}
