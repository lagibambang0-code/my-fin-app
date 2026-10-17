import type { Metadata } from 'next'
import { AssetStats } from '@/components/asset-stats'

export const metadata: Metadata = { title: 'Total statistik — Dompetku' }

export default function AssetStatsPage() {
  return <AssetStats />
}
