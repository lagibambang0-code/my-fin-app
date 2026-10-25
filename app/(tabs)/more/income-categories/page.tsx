import type { Metadata } from 'next'
import { CategoryList } from '@/components/category-list'

export const metadata: Metadata = { title: 'Income Categories — Dompetku' }

export default function IncomeCategoriesPage() {
  return <CategoryList categoryType="income" />
}
