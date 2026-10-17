import type { Metadata } from 'next'
import { RepeatSettingsScreen } from '@/components/repeat-settings-screen'

export const metadata: Metadata = { title: 'Kelola berulang — Dompetku' }

export default function BerulangPage() {
  return <RepeatSettingsScreen />
}
