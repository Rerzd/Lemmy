import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BudgetStatus, Category, CategoryTotal } from '../../types/api'
import { GroceriesCalculator } from './GroceriesCalculator'
import { RuleCalculator } from './RuleCalculator'

vi.mock('../../api/summary', () => ({ getByCategory: vi.fn(), getOverview: vi.fn() }))
vi.mock('../../api/budgets', () => ({ getBudgetStatus: vi.fn(), createBudget: vi.fn() }))
vi.mock('../../api/reports', () => ({ getLivingCosts: vi.fn() }))

const summary = await import('../../api/summary')
const budgets = await import('../../api/budgets')
const reports = await import('../../api/reports')

const PERIOD = { year: 2026, month: 10 }
const category = (id: number, name: string, type: 'income' | 'expense'): Category => ({
  id,
  user_id: 1,
  name,
  type,
  color: '#10b981',
  icon: 'tag',
  is_fixed: false,
})
const CATEGORIES = [category(1, 'Salary', 'income'), category(4, 'Food & dining', 'expense'), category(5, 'Transport', 'expense')]
const spent = (category_id: number, total: number) => ({ category_id, total }) as CategoryTotal

// Matches text regardless of the non-breaking spaces Intl puts in "$ 1.083.333".
const text = (pattern: string) => (content: string) => content.replace(/[\u00a0\u202f]/g, ' ').includes(pattern)

function renderGroceries() {
  render(
    <MemoryRouter>
      <GroceriesCalculator currency="COP" period={PERIOD} search="" categories={CATEGORIES} />
    </MemoryRouter>,
  )
  // 2 people, weekly, 250,000 per shop -> 1,083,333 a month (no meals out).
  fireEvent.change(screen.getByLabelText('Budget per shop'), { target: { value: '250000' } })
}

describe('GroceriesCalculator', () => {
  beforeEach(() => vi.resetAllMocks())

  it('shows the live plan and picks a food category by default', () => {
    renderGroceries()
    expect(screen.getByText(text('$ 1.083.333'), { selector: 'p' })).toBeTruthy()
    expect((screen.getByLabelText('Category to check') as HTMLSelectElement).value).toBe('4')
    // Income categories are never offered.
    expect(screen.queryByRole('option', { name: 'Salary' })).toBeNull()
  })

  it('validates inputs inline', () => {
    renderGroceries()
    fireEvent.change(screen.getByLabelText('People in the household'), { target: { value: '0' } })
    expect(screen.getByText('Must be at least 1.')).toBeTruthy()
    expect(screen.getByLabelText('People in the household').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(/Enter how many people/)).toBeTruthy()
    expect((screen.getByRole('button', { name: /Compare with my spending/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('compares the plan with real spending and shows a status with a label', async () => {
    vi.mocked(summary.getByCategory).mockResolvedValue([spent(4, 900_000), spent(5, 50_000)])
    renderGroceries()
    fireEvent.click(screen.getByRole('button', { name: /Compare with my spending/ }))
    expect(await screen.findByText('Close to plan')).toBeTruthy()
    expect(screen.getByText(text('Spent $ 900.000 in Food & dining in October 2026, 83% of the $ 1.083.333 planned ($ 183.333 left).'))).toBeTruthy()
    expect(summary.getByCategory).toHaveBeenCalledWith(10, 2026, 'expense')

    // Changing the plan updates the comparison without fetching again.
    fireEvent.change(screen.getByLabelText('Budget per shop'), { target: { value: '150000' } })
    expect(screen.getByText('Over plan')).toBeTruthy()
    expect(summary.getByCategory).toHaveBeenCalledTimes(1)
  })

  it('says so when there is no spending in that category', async () => {
    vi.mocked(summary.getByCategory).mockResolvedValue([spent(5, 50_000)])
    renderGroceries()
    fireEvent.click(screen.getByRole('button', { name: /Compare with my spending/ }))
    expect(await screen.findByText(/No spending in Food & dining in October 2026 yet/)).toBeTruthy()
  })

  it('opens the budget form prefilled with the category and monthly amount', async () => {
    vi.mocked(budgets.getBudgetStatus).mockResolvedValue([])
    vi.mocked(budgets.createBudget).mockResolvedValue({ id: 9, user_id: 1, category_id: 4, amount: 1_083_333, currency: 'COP', month: 10, year: 2026 })
    renderGroceries()
    fireEvent.click(screen.getByRole('button', { name: /Create budget from this plan/ }))

    const dialog = await screen.findByRole('dialog')
    expect((within(dialog).getByLabelText('Category') as HTMLSelectElement).value).toBe('4')
    expect((within(dialog).getByLabelText(/Monthly limit/) as HTMLInputElement).value).toBe('1083333')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add budget' }))
    await waitFor(() => expect(budgets.createBudget).toHaveBeenCalledWith({ category_id: 4, amount: 1_083_333, month: 10, year: 2026 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps one budget per category and month: explains instead of opening the form', async () => {
    vi.mocked(budgets.getBudgetStatus).mockResolvedValue([{ category_id: 4, budgeted: 1_030_000 } as BudgetStatus])
    renderGroceries()
    fireEvent.click(screen.getByRole('button', { name: /Create budget from this plan/ }))
    expect(await screen.findByText(text('Food & dining already has a budget of $ 1.030.000 for October 2026.'))).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('link', { name: 'change it on the Budgets page' }).getAttribute('href')).toBe('/budgets')
  })

  it('shows API errors from the form (validation still applies)', async () => {
    vi.mocked(budgets.getBudgetStatus).mockResolvedValue([])
    vi.mocked(budgets.createBudget).mockRejectedValue(
      Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409, data: { detail: 'A budget for this category in 10/2026 already exists.' } } }),
    )
    renderGroceries()
    fireEvent.click(screen.getByRole('button', { name: /Create budget from this plan/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add budget' }))
    expect(await within(dialog).findByText('A budget for this category in 10/2026 already exists.')).toBeTruthy()
  })
})

describe('RuleCalculator', () => {
  beforeEach(() => vi.resetAllMocks())

  function renderRule() {
    render(<RuleCalculator currency="COP" period={PERIOD} />)
    fireEvent.change(screen.getByLabelText('Monthly net income'), { target: { value: '5000000' } })
  }

  it('splits income and compares with the real month', async () => {
    vi.mocked(reports.getLivingCosts).mockResolvedValue({ this_month: { fixed: 2_070_000 } } as never)
    vi.mocked(summary.getOverview).mockResolvedValue({ savings_rate: -0.43, transaction_count: 34 } as never)
    renderRule()
    expect(screen.getByText(text('$ 2.500.000'))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Compare with my month/ }))
    expect(await screen.findByText(text('Fixed costs this month are $ 2.070.000, 41% of your income: within the 50% for needs.'))).toBeTruthy()
    expect(screen.getByText('You spent more than you earned this month (-43%), so nothing went to savings yet.')).toBeTruthy()
    expect(reports.getLivingCosts).toHaveBeenCalledWith('2026-10')
  })

  it('skips gracefully when the month is empty', async () => {
    vi.mocked(reports.getLivingCosts).mockResolvedValue({ this_month: { fixed: 0 } } as never)
    vi.mocked(summary.getOverview).mockResolvedValue({ savings_rate: null, transaction_count: 0 } as never)
    renderRule()
    fireEvent.click(screen.getByRole('button', { name: /Compare with my month/ }))
    expect(await screen.findByText('Nothing recorded this month yet, so there is nothing to compare.')).toBeTruthy()
  })
})
