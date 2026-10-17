import type { Metadata } from 'next'
import { PasswordSettingsScreen } from '@/components/password-settings-screen'

export const metadata: Metadata = { title: 'Kata sandi — Dompetku' }

export default function KataSandiPage() {
  return <PasswordSettingsScreen />
}