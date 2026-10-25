import type { Metadata } from 'next'
import { TagSettingsScreen } from '@/components/tag-settings-screen'

export const metadata: Metadata = { title: 'Tag Settings — Dompetku' }

export default function TagsPage() {
  return <TagSettingsScreen />
}
