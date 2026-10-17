import type { Metadata } from 'next'
import { StatistikScreen } from '@/components/statistik-screen'

export const metadata: Metadata = { title: 'Statistik — Dompetku' }

export default function StatistikPage() {
  return <StatistikScreen />
}
