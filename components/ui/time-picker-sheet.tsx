'use client'

/**
 * TimePickerSheet — drum/wheel style time picker rendered inside an Overlay.
 *
 * Two columns (HH | MM) scroll independently via touch / mouse drag.
 * The selected slot snaps to center; the surrounding items are visible and
 * clickable for quick single-tap adjustment.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { Overlay } from '@/components/ui/overlay'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── constants ─────────────────────────────────────────────────────────────── */

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

/** Height of one drum cell in px. */
const CELL_H = 52

/** How many cells are visible above & below the selected cell. */
const VISIBLE_SIDE = 2

/** Total drum height: selected + cells above + cells below. */
const DRUM_H = CELL_H * (1 + VISIBLE_SIDE * 2)

/* ── DrumColumn ────────────────────────────────────────────────────────────── */

interface DrumColumnProps {
  items: string[]
  selected: number
  onChange: (index: number) => void
  label: string
}

function DrumColumn({ items, selected, onChange, label }: DrumColumnProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  /* Scroll the track so the selected item centres itself. */
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ top: selected * CELL_H, behavior: 'smooth' })
  }, [selected])

  /* On scroll end, snap to the nearest item and fire onChange. */
  const onScroll = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const idx = Math.round(el.scrollTop / CELL_H)
    const clamped = Math.max(0, Math.min(items.length - 1, idx))
    if (clamped !== selected) onChange(clamped)
  }, [items.length, selected, onChange])

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>

      {/* Drum track */}
      <div className="relative w-full overflow-hidden rounded-2xl">
        {/* Fade top */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(50%-26px)] bg-gradient-to-b from-card to-transparent"
        />
        {/* Selection highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 rounded-xl border border-primary/20 bg-primary/8"
          style={{ height: CELL_H }}
        />
        {/* Fade bottom */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[calc(50%-26px)] bg-gradient-to-t from-card to-transparent"
        />

        {/* Scrollable track */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          role="listbox"
          aria-label={label}
          style={{ height: DRUM_H }}
          className="overflow-y-scroll scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-y snap-mandatory"
        >
          {/* Top padding so index 0 centres */}
          <div style={{ height: CELL_H * VISIBLE_SIDE }} aria-hidden="true" />

          {items.map((item, idx) => {
            const isSelected = idx === selected
            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onChange(idx)}
                style={{ height: CELL_H }}
                className={cn(
                  'flex w-full snap-center items-center justify-center text-2xl font-semibold tabular-nums transition-all duration-150',
                  isSelected
                    ? 'scale-110 text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground',
                )}
              >
                {item}
              </button>
            )
          })}

          {/* Bottom padding so the last index centres */}
          <div style={{ height: CELL_H * VISIBLE_SIDE }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

/* ── TimePickerSheet ────────────────────────────────────────────────────────── */

export interface TimePickerSheetProps {
  open: boolean
  /** "HH:MM" string, e.g. "07:30" */
  value: string
  onSelect: (value: string) => void
  onClose: () => void
}

function parseTime(v: string): [number, number] {
  const [h = '0', m = '0'] = v.split(':')
  return [
    Math.max(0, Math.min(23, parseInt(h, 10) || 0)),
    Math.max(0, Math.min(59, parseInt(m, 10) || 0)),
  ]
}

export function TimePickerSheet({ open, value, onSelect, onClose }: TimePickerSheetProps) {
  const [hour, setHour] = useState(0)
  const [minute, setMinute] = useState(0)

  /* Sync local state whenever sheet opens or external value changes. */
  useEffect(() => {
    if (open) {
      const [h, m] = parseTime(value)
      setHour(h)
      setMinute(m)
    }
  }, [open, value])

  const confirm = () => {
    onSelect(`${HOURS[hour]}:${MINUTES[minute]}`)
    onClose()
  }

  return (
    <Overlay open={open} onClose={onClose} align="bottom" label="Waktu transaksi">
      <div className="mx-auto flex w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-border/80 bg-card pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-sm md:rounded-2xl md:border">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Waktu transaksi</h2>
          </div>
          {/* Live preview */}
          <span className="font-mono text-xl font-bold tabular-nums text-primary">
            {HOURS[hour]}:{MINUTES[minute]}
          </span>
        </div>

        {/* Drum columns */}
        <div className="flex items-stretch gap-3 px-5 py-3">
          <DrumColumn
            items={HOURS}
            selected={hour}
            onChange={setHour}
            label="Jam"
          />

          {/* Colon separator */}
          <div className="flex items-center pt-6">
            <span className="text-2xl font-bold text-muted-foreground/60">:</span>
          </div>

          <DrumColumn
            items={MINUTES}
            selected={minute}
            onChange={setMinute}
            label="Menit"
          />
        </div>

        {/* Confirm */}
        <div className="px-5 pt-1">
          <Button className="h-12 w-full text-base" onClick={confirm}>
            Selesai
          </Button>
        </div>
      </div>
    </Overlay>
  )
}
