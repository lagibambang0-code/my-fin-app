import type { Metadata } from 'next'
import { CardTimingSettings } from '@/components/card-timing-settings'

export const metadata: Metadata = { title: 'Card Accounting — Dompetku' }

export default function CardAccountingPage() {
  return <CardTimingSettings />
}
