import type { Metadata } from 'next'
import { DeletedAssetsScreen } from '@/components/deleted-assets-screen'

export const metadata: Metadata = { title: 'Grup aset yang dihapus — Dompetku' }

export default function GrupDihapusPage() {
  return <DeletedAssetsScreen mode="groups" />
}
