import type { Metadata } from 'next'
import { BudgetListScreen } from '@/components/budget-list-screen'

export const metadata: Metadata = { title: 'Anggaran — Dompetku' }

export default function AnggaranPage() {
  return <BudgetListScreen />
}
