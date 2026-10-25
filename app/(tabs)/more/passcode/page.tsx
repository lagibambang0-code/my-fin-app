import type { Metadata } from 'next'
import { PasswordSettingsScreen } from '@/components/password-settings-screen'

export const metadata: Metadata = { title: 'Passcode — Dompetku' }

export default function PasscodePage() {
  return <PasswordSettingsScreen />
}
