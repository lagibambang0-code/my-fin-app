import type { Metadata } from 'next'
import { AssetSettingsScreen } from '@/components/asset-settings-screen'

export const metadata: Metadata = { title: 'Kelola aset — Dompetku' }

export default function KelolaAsetPage() {
  return <AssetSettingsScreen />
}
