import type { Metadata } from 'next'
import { ThemeSettings } from '@/components/theme-settings'

export const metadata: Metadata = { title: 'Tema — Dompetku' }

export default function TemaPage() {
  return <ThemeSettings />
}
