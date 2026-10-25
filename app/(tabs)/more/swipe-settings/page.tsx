import type { Metadata } from 'next'
import { SwipeGestureSettingsScreen } from '@/components/swipe-gesture-settings-screen'

export const metadata: Metadata = { title: 'Swipe Settings — Dompetku' }

export default function SwipeSettingsPage() {
  return <SwipeGestureSettingsScreen />
}
