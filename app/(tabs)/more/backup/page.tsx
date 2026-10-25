import type { Metadata } from 'next'
import { BackupScreen } from '@/components/backup-screen'

export const metadata: Metadata = { title: 'Backup — Dompetku' }

export default function BackupPage() {
  return <BackupScreen />
}
