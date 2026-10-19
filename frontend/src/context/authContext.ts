import { createContext } from 'react'
import type { User } from '../types/auth'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, currency?: string) => Promise<void>
  logout: () => void
}

// Lives in its own file so AuthContext.tsx only exports components (fast refresh).
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
