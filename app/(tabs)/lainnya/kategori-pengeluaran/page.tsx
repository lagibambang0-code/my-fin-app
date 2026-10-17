import type { Metadata } from 'next'
import { CategoryList } from '@/components/category-list'

export const metadata: Metadata = { title: 'Kategori pengeluaran — Dompetku' }

export default function KategoriPengeluaranPage() {
  return <CategoryList categoryType="expense" />
}
