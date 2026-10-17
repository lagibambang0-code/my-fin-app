import type { Metadata } from 'next'
import { CardTimingSettings } from '@/components/card-timing-settings'

export const metadata: Metadata = { title: 'Cara catat pengeluaran kartu — Dompetku' }

export default function CardTimingPage() {
  return <CardTimingSettings />
}
