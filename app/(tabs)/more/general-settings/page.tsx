import type { Metadata } from 'next'
import { GeneralSettingsScreen } from '@/components/general-settings-screen'

export const metadata: Metadata = { title: 'General Settings — Dompetku' }

export default function GeneralSettingsPage() {
  return <GeneralSettingsScreen />
}
