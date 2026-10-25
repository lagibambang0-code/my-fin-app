import type { Metadata } from 'next'
import { DeletedAssetsScreen } from '@/components/deleted-assets-screen'

export const metadata: Metadata = { title: 'Deleted Accounts — Dompetku' }

export default function DeletedAccountsPage() {
  return <DeletedAssetsScreen mode="assets" />
}
