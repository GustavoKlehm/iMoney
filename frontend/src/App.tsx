import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { TransactionsPage } from './pages/Transactions';
import { NewTransactionPage } from './pages/NewTransaction';
import { CategoriesPage } from './pages/Categories';
import { LoginPage } from './pages/Login';

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) return <div className="page-loading">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<ProtectedRoutes />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="lancamentos" element={<TransactionsPage />} />
              <Route path="lancamentos/novo" element={<NewTransactionPage />} />
              <Route path="categorias" element={<CategoriesPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
