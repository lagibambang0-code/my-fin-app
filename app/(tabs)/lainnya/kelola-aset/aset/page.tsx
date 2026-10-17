import type { Metadata } from 'next'
import { AssetSettingsList } from '@/components/asset-settings-list'

export const metadata: Metadata = { title: 'Pengaturan aset — Dompetku' }

export default function PengaturanAsetPage() {
  return <AssetSettingsList />
}
