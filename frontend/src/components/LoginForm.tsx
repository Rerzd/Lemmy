import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login } = useAuth()
  // Each input field has its own state — these are "controlled inputs".
  // React owns the value; the input just displays it and reports changes.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-slate-400">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-violet-400 hover:text-violet-300 font-medium"
        >
          Create one
        </button>
      </p>
    </form>
  )
}
