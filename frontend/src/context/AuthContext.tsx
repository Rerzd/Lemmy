import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import { TOKEN_KEY, UNAUTHORIZED_EVENT } from '../api/client'
import type { User } from '../types/auth'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // `loading` is true until we've checked whether there's a saved token.
  // Prevents flashing the login form to a user who's already logged in.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  // On first mount, if a token exists, fetch the user to confirm it's still valid.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    authApi
      .getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  // The API client fires this when any request comes back 401 (expired token).
  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  async function login(email: string, password: string) {
    const { access_token } = await authApi.login(email, password)
    localStorage.setItem(TOKEN_KEY, access_token)
    const me = await authApi.getMe()
    setUser(me)
  }

  async function register(name: string, email: string, password: string, currency = 'COP') {
    await authApi.register({ name, email, password, currency })
    await login(email, password)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
