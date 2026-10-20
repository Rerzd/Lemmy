import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BudgetProgress, BudgetStatusLabel } from './BudgetProgress'
import { Pagination } from './Pagination'
import { SegmentedControl } from './SegmentedControl'

describe('BudgetProgress', () => {
  it('reports the real percentage but caps the bar at 100%', () => {
    render(<BudgetProgress pct={127.4} status="over" />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('127')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%')
  })

  it('labels the status in text, not only color', () => {
    render(<BudgetStatusLabel status="warning" />)
    expect(screen.getByText('Close to limit')).toBeTruthy()
  })
})

describe('Pagination', () => {
  it('shows the visible range and disables Previous on the first page', () => {
    const onChange = vi.fn()
    render(<Pagination page={1} pageSize={15} total={31} onChange={onChange} />)
    expect(screen.getByText('1–15 of 31')).toBeTruthy()
    expect(screen.getByText('Page 1 of 3')).toBeTruthy()
    expect((screen.getByLabelText('Previous page') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByLabelText('Next page'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('disables Next on the last page', () => {
    render(<Pagination page={3} pageSize={15} total={31} onChange={() => {}} />)
    expect(screen.getByText('31–31 of 31')).toBeTruthy()
    expect((screen.getByLabelText('Next page') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('SegmentedControl', () => {
  it('marks the selected option and reports clicks', () => {
    const onChange = vi.fn()
    const options = [
      { value: 'all', label: 'All' },
      { value: 'income', label: 'Income' },
      { value: 'expense', label: 'Expense' },
    ]
    render(<SegmentedControl label="Filter by type" value="income" options={options} onChange={onChange} />)

    expect(screen.getByRole('radiogroup', { name: 'Filter by type' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Income' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('false')

    fireEvent.click(screen.getByRole('radio', { name: 'Expense' }))
    expect(onChange).toHaveBeenCalledWith('expense')
  })
})
