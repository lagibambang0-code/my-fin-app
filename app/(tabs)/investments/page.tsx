import type { Metadata } from 'next'
import { InvestmentsScreen } from '@/components/investments-screen'

export const metadata: Metadata = {
  title: 'Investments — Dompetku',
  description: 'Track investment assets and portfolio performance.',
}

export default function InvestmentsPage() {
  return <InvestmentsScreen />
}
