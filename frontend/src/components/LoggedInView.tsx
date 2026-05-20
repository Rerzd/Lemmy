import { useAuth } from '../context/AuthContext'

export function LoggedInView() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-2xl shadow-violet-500/5 p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 items-center justify-center text-2xl font-bold text-white shadow-lg shadow-violet-500/25">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-100">
              Welcome, {user.name}
            </h2>
            <p className="text-slate-400 text-sm">{user.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-slate-500 text-xs">Currency</div>
              <div className="text-slate-200 font-medium">{user.currency}</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-slate-500 text-xs">User ID</div>
              <div className="text-slate-200 font-medium">#{user.id}</div>
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm text-center">
            ✓ Stage 2 complete — auth flow working
          </div>

          <button
            onClick={logout}
            className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
