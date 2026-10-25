import type { Metadata } from 'next'
import { TransaksiScreen } from '@/components/transaksi-screen'

export const metadata: Metadata = { title: 'Transactions — Dompetku' }

export default function TransactionsPage() {
  return <TransaksiScreen />
}
