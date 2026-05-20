// These types mirror the Pydantic schemas in backend/app/schemas/user.py.
// Keeping them in sync gives us autocomplete + compile-time safety.

export interface User {
  id: number
  name: string
  email: string
  currency: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  currency?: string
}
