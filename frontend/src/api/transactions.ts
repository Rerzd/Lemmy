import { api } from './client'
import type { Page, Transaction, TransactionFilters, TransactionPayload } from '../types/api'

export async function listTransactions(filters: TransactionFilters = {}): Promise<Page<Transaction>> {
  const response = await api.get<Transaction[]>('/transactions', { params: filters })
  // The backend keeps the body a plain list and sends the total in a header.
  const total = Number(response.headers['x-total-count'] ?? response.data.length)
  return { items: response.data, total }
}

export async function createTransaction(payload: TransactionPayload): Promise<Transaction> {
  const { data } = await api.post<Transaction>('/transactions', payload)
  return data
}

export async function updateTransaction(id: number, payload: TransactionPayload): Promise<Transaction> {
  const { data } = await api.put<Transaction>(`/transactions/${id}`, payload)
  return data
}

export async function deleteTransaction(id: number): Promise<void> {
  await api.delete(`/transactions/${id}`)
}
