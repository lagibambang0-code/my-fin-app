import type { Metadata } from 'next'
import { DeletedAssetsScreen } from '@/components/deleted-assets-screen'

export const metadata: Metadata = { title: 'Deleted Groups — Dompetku' }

export default function DeletedGroupsPage() {
  return <DeletedAssetsScreen mode="groups" />
}
