import type { Metadata } from 'next'
import { AssetGroupManager } from '@/components/asset-group-manager'

export const metadata: Metadata = { title: 'Account Groups — Dompetku' }

export default function AccountGroupsPage() {
  return <AssetGroupManager />
}
