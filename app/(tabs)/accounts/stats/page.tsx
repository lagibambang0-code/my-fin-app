import type { Metadata } from 'next'
import { AssetStats } from '@/components/asset-stats'

export const metadata: Metadata = { title: 'Account Statistics — Dompetku' }

export default function AccountStatsPage() {
  return <AssetStats />
}
