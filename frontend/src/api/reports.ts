import { api } from './client'
import type { CategorySpending, LivingCosts } from '../types/api'

// Months travel as YYYY-MM, matching the ?month= value in the app's URL.
export async function getLivingCosts(month: string): Promise<LivingCosts> {
  const { data } = await api.get<LivingCosts>('/reports/living-costs', { params: { month } })
  return data
}

export async function getCategorySpending(from: string, to: string): Promise<CategorySpending> {
  const { data } = await api.get<CategorySpending>('/reports/category-spending', { params: { from, to } })
  return data
}

// The export needs the auth header, so it's fetched as a blob instead of opened as a link.
export async function downloadTransactionsCsv(month: string): Promise<void> {
  const response = await api.get<Blob>('/reports/export.csv', { params: { month }, responseType: 'blob' })
  const match = /filename="([^"]+)"/.exec(response.headers['content-disposition'] ?? '')
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = match?.[1] ?? `lemmy-transactions-${month}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
