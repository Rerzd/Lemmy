import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './components/AuthPage'
import { AppShell } from './components/layout/AppShell'
import { PublicOnly, RequireAuth } from './components/RouteGuards'
import { BudgetsPage } from './pages/Budgets'
import { CategoriesPage } from './pages/Categories'
import { DashboardPage } from './pages/Dashboard'
import { TransactionsPage } from './pages/Transactions'

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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
