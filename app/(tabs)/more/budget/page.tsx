import type { Metadata } from 'next'
import { BudgetListScreen } from '@/components/budget-list-screen'

export const metadata: Metadata = { title: 'Budget Settings — Dompetku' }

export default function BudgetPage() {
  return <BudgetListScreen />
}
