import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FullPageSpinner } from './ui/Spinner'

interface RedirectState {
  from?: { pathname: string; search: string }
}

// Signed-out users go to /login and come back to where they were after signing in.
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location } satisfies RedirectState} />
  return <Outlet />
}

// /login and /register make no sense once signed in.
export function PublicOnly() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (user) {
    const from = (location.state as RedirectState | null)?.from
    return <Navigate to={from ? `${from.pathname}${from.search}` : '/'} replace />
  }
  return <Outlet />
}
