import type { Metadata } from 'next'
import { DeletedAssetsScreen } from '@/components/deleted-assets-screen'

export const metadata: Metadata = { title: 'Aset yang dihapus — Dompetku' }

export default function AsetDihapusPage() {
  return <DeletedAssetsScreen mode="assets" />
}
