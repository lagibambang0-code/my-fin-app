import type { Metadata } from 'next'
import { TransferSettings } from '@/components/transfer-settings'

export const metadata: Metadata = { title: 'Transfer Expenses — Dompetku' }

export default function TransferExpensesPage() {
  return <TransferSettings />
}
