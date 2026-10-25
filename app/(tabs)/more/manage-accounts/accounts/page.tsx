import type { Metadata } from 'next'
import { AssetSettingsList } from '@/components/asset-settings-list'

export const metadata: Metadata = { title: 'Account Settings — Dompetku' }

export default function AccountSettingsPage() {
  return <AssetSettingsList />
}
