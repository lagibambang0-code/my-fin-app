import type { Metadata } from 'next'
import { CategoryList } from '@/components/category-list'

export const metadata: Metadata = { title: 'Kategori pendapatan — Dompetku' }

export default function KategoriPendapatanPage() {
  return <CategoryList categoryType="income" />
}
