import type { Metadata } from 'next'
import { LanguageSettingsScreen } from '@/components/language-settings-screen'

export const metadata: Metadata = { title: 'Language Settings — Dompetku' }

export default function LanguagePage() {
  return <LanguageSettingsScreen />
}
