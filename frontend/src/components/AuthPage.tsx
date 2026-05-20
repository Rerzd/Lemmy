import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            Lemmy
          </h1>
          <p className="text-slate-400 mt-2">Your personal finance tracker</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-2xl shadow-violet-500/5 p-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  )
}
