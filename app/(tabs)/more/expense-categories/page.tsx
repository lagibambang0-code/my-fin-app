import type { Metadata } from 'next'
import { CategoryList } from '@/components/category-list'

export const metadata: Metadata = { title: 'Expense Categories — Dompetku' }

export default function ExpenseCategoriesPage() {
  return <CategoryList categoryType="expense" />
}
