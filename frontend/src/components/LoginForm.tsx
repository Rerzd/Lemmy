import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../lib/errors'
import { inputClass, labelClass } from '../lib/ui'
import { Button } from './ui/Button'

// Created by `npm run setup` / `npm run db:reset` (backend/app/scripts/seed_demo.py).
const DEMO = { email: 'demo@lemmy.app', password: 'demo1234' }

export function LoginForm() {
  const { login } = useAuth()
  // Each input field has its own state — these are "controlled inputs".
  // React owns the value; the input just displays it and reports changes.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function signIn(emailValue: string, passwordValue: string) {
    setError(null)
    setSubmitting(true)
    try {
      await login(emailValue, passwordValue)
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void signIn(email, password)
  }

  function fillDemo() {
    setEmail(DEMO.email)
    setPassword(DEMO.password)
    void signIn(DEMO.email, DEMO.password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="Your password"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" loading={submitting} className="w-full">
        Sign in
      </Button>
      <Button variant="secondary" onClick={fillDemo} disabled={submitting} className="w-full">
        Try the demo account
      </Button>

      <p className="pt-1 text-center text-sm text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-violet-300 hover:text-violet-200">
          Create one
        </Link>
      </p>
    </form>
  )
}
