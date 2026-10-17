import type { Metadata } from 'next'
import { TransaksiScreen } from '@/components/transaksi-screen'

export const metadata: Metadata = { title: 'Transaksi — Dompetku' }

export default function TransaksiPage() {
  return <TransaksiScreen />
}
