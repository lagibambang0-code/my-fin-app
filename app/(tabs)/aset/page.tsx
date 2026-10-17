import type { Metadata } from 'next'
import { AssetScreen } from '@/components/asset-screen'

export const metadata: Metadata = { title: 'Aset — Dompetku' }

export default function AsetPage() {
  return <AssetScreen />
}
