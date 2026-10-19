import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../lib/errors'
import { inputClass, labelClass } from '../lib/ui'
import { Button } from './ui/Button'

export function RegisterForm() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(name, email, password, currency)
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Jane Doe"
        />
      </div>
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
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="At least 6 characters"
        />
      </div>
      <div>
        <label htmlFor="currency" className={labelClass}>
          Currency
        </label>
        <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
          <option value="COP">COP - Colombian Peso</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="MXN">MXN - Mexican Peso</option>
        </select>
        <p className="mt-1.5 text-xs text-slate-500">Every amount you record will use this currency.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" loading={submitting} className="w-full">
        Create account
      </Button>

      <p className="pt-1 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-violet-300 hover:text-violet-200">
          Sign in
        </Link>
      </p>
    </form>
  )
}
