import { Logo } from './layout/Logo'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <p className="mt-3 text-sm text-text-muted">Track income, spending and budgets in one place.</p>
        </div>

        <div className="rounded-overlay border border-border bg-surface p-6 shadow-raised sm:p-7">
          <h1 className="mb-5 text-xl font-semibold text-text">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  )
}
