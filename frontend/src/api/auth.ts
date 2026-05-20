import { api } from './client'
import type { RegisterPayload, TokenResponse, User } from '../types/auth'

export async function register(payload: RegisterPayload): Promise<User> {
  const { data } = await api.post<User>('/auth/register', payload)
  return data
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  // The backend uses OAuth2PasswordRequestForm, which expects form-encoded data
  // with `username` and `password` fields — NOT JSON. This is the OAuth2 standard.
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)

  const { data } = await api.post<TokenResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}
