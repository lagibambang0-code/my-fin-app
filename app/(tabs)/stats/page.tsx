import type { Metadata } from 'next'
import { StatistikScreen } from '@/components/statistik-screen'

export const metadata: Metadata = { title: 'Statistics — Dompetku' }

export default function StatsPage() {
  return <StatistikScreen />
}
