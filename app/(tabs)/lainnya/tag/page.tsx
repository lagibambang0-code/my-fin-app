import type { Metadata } from 'next'
import { TagSettingsScreen } from '@/components/tag-settings-screen'

export const metadata: Metadata = { title: 'Kelola tag — Dompetku' }

export default function TagPage() {
  return <TagSettingsScreen />
}
