import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './components/AuthPage'
import { AppShell } from './components/layout/AppShell'
import { PublicOnly, RequireAuth } from './components/RouteGuards'

// Pages load on demand, so the login screen doesn't download the charting library.
const DashboardPage = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })))
const TransactionsPage = lazy(() => import('./pages/Transactions').then((m) => ({ default: m.TransactionsPage })))
const CategoriesPage = lazy(() => import('./pages/Categories').then((m) => ({ default: m.CategoriesPage })))
const BudgetsPage = lazy(() => import('./pages/Budgets').then((m) => ({ default: m.BudgetsPage })))
const ReportsPage = lazy(() => import('./pages/Reports').then((m) => ({ default: m.ReportsPage })))

function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
