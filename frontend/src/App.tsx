import { useAuth } from './context/AuthContext'
import { AuthPage } from './components/AuthPage'
import { LoggedInView } from './components/LoggedInView'

function App() {
  const { user, loading } = useAuth()

  // While checking for an existing token, show a tiny loader.
  // Prevents the login form from flashing for already-authenticated users.
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return user ? <LoggedInView /> : <AuthPage />
}

export default App
