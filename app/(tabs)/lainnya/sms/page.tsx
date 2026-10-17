import type { Metadata } from 'next'
import { SmsScreen } from '@/components/sms-screen'

export const metadata: Metadata = { title: 'Masukkan SMS — Dompetku' }

export default function SmsPage() {
  return <SmsScreen />
}
