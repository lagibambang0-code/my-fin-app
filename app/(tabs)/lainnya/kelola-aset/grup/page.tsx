import type { Metadata } from 'next'
import { AssetGroupManager } from '@/components/asset-group-manager'

export const metadata: Metadata = { title: 'Grup aset — Dompetku' }

export default function GrupAsetPage() {
  return <AssetGroupManager />
}
