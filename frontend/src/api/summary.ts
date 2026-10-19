import { api } from './client'
import type { CategoryTotal, Overview, TrendPoint, TxType } from '../types/api'

export async function getOverview(month: number, year: number): Promise<Overview> {
  const { data } = await api.get<Overview>('/summary/overview', { params: { month, year } })
  return data
}

export async function getByCategory(month: number, year: number, type: TxType = 'expense'): Promise<CategoryTotal[]> {
  const { data } = await api.get<CategoryTotal[]>('/summary/by-category', { params: { month, year, type } })
  return data
}

export async function getTrend(months = 6): Promise<TrendPoint[]> {
  const { data } = await api.get<TrendPoint[]>('/summary/trend', { params: { months } })
  return data
}
