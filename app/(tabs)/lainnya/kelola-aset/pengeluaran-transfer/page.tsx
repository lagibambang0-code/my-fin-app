import type { Metadata } from 'next'
import { TransferSettings } from '@/components/transfer-settings'

export const metadata: Metadata = { title: 'Pengaturan pengeluaran transfer — Dompetku' }

export default function TransferSettingsPage() {
  return <TransferSettings />
}
