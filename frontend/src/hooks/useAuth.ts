import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../context/authContext'

// Custom hook so components do `const { user, login } = useAuth()`
// instead of having to import the context object themselves.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Every amount in the app uses the signed-in user's single currency.
export function useCurrency(): string {
  return useAuth().user?.currency ?? 'COP'
}
