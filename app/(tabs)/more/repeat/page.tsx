import type { Metadata } from 'next'
import { RepeatSettingsScreen } from '@/components/repeat-settings-screen'

export const metadata: Metadata = { title: 'Repeat Settings — Dompetku' }

export default function RepeatPage() {
  return <RepeatSettingsScreen />
}
