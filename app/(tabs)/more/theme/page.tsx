import type { Metadata } from 'next'
import { ThemeSettings } from '@/components/theme-settings'

export const metadata: Metadata = { title: 'Theme — Dompetku' }

export default function ThemePage() {
  return <ThemeSettings />
}
