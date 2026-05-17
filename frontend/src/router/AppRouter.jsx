import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardOwnerPage from '../pages/DashboardOwnerPage.jsx';
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

function AppRouter({ location }) {
  const { user } = useAuth();

  return (
    <Routes location={location}>
      <Route path="/" element={<DashboardOwnerPage />} />
      <Route path="/login" element={<DashboardOwnerPage />} />
      <Route path="/register" element={<DashboardOwnerPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/dashboard"
        element={user ? <DashboardOwnerPage /> : <Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default AppRouter;