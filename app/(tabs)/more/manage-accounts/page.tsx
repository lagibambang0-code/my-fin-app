import type { Metadata } from 'next'
import { AssetSettingsScreen } from '@/components/asset-settings-screen'

export const metadata: Metadata = { title: 'Manage Accounts — Dompetku' }

export default function ManageAccountsPage() {
  return <AssetSettingsScreen />
}
