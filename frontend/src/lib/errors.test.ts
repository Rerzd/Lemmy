import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './errors'

function apiError(status: number, data: unknown) {
  const response = { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('getErrorMessage', () => {
  it('uses a string detail as-is (our 404/409/422 business rules)', () => {
    const detail = 'Category has 11 transactions and 0 budgets. Reassign or delete them first.'
    expect(getErrorMessage(apiError(409, { detail }))).toBe(detail)
  })

  it('joins FastAPI validation issues with their field names', () => {
    const detail = [
      { loc: ['body', 'amount'], msg: 'Input should be greater than 0' },
      { loc: ['body'], msg: 'Field required' },
    ]
    expect(getErrorMessage(apiError(422, { detail }))).toBe('amount: Input should be greater than 0. Field required')
  })

  it('explains network failures', () => {
    expect(getErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatch(/Cannot reach the server/)
  })

  it('falls back for anything else', () => {
    expect(getErrorMessage(new Error('boom'), 'Fallback')).toBe('Fallback')
    expect(getErrorMessage(apiError(500, 'Internal Server Error'), 'Fallback')).toBe('Fallback')
  })
})
