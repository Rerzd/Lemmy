import { api } from './client'
import type { Budget, BudgetPayload, BudgetStatus } from '../types/api'

export async function listBudgets(month: number, year: number): Promise<Budget[]> {
  const { data } = await api.get<Budget[]>('/budgets', { params: { month, year } })
  return data
}

export async function getBudgetStatus(month: number, year: number): Promise<BudgetStatus[]> {
  const { data } = await api.get<BudgetStatus[]>('/budgets/status', { params: { month, year } })
  return data
}

export async function createBudget(payload: BudgetPayload): Promise<Budget> {
  const { data } = await api.post<Budget>('/budgets', payload)
  return data
}

export async function updateBudget(id: number, amount: number): Promise<Budget> {
  const { data } = await api.put<Budget>(`/budgets/${id}`, { amount })
  return data
}

export async function deleteBudget(id: number): Promise<void> {
  await api.delete(`/budgets/${id}`)
}
