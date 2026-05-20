import { Routes, Route } from 'react-router-dom';
import DashboardOwnerPage from '../pages/DashboardOwnerPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx';
import AdminLoginPage from '../pages/AdminLoginPage.jsx';
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx';
import AdminCreateUserPage from '../pages/AdminCreateUserPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx';
import RequireRole from '../components/common/RequireRole.jsx';
import RequireGuest from '../components/common/RequireGuest.jsx';

function AppRouter({ location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<DashboardOwnerPage />} />
      <Route path="/login" element={<DashboardOwnerPage />} />
      <Route path="/register" element={<DashboardOwnerPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/forgot-password"
        element={
          <RequireGuest>
            <ForgotPasswordPage />
          </RequireGuest>
        }
      />
      <Route
        path="/reset-password"
        element={
          <RequireGuest>
            <ResetPasswordPage />
          </RequireGuest>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireRole>
            <DashboardPage />
          </RequireRole>
        }
      />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireRole role="admin" redirectTo="/admin/login">
            <AdminDashboardPage />
          </RequireRole>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <RequireRole role="admin" redirectTo="/admin/login">
            <AdminCreateUserPage />
          </RequireRole>
        }
      />
    </Routes>
  );
}

export default AppRouter;
