import type { Metadata } from 'next'
import { SwipeGestureSettingsScreen } from '@/components/swipe-gesture-settings-screen'

export const metadata: Metadata = { title: 'Pengaturan geser — Dompetku' }

export default function PengaturanGeserPage() {
  return <SwipeGestureSettingsScreen />
}