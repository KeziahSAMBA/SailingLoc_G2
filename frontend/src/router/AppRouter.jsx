import { Routes, Route } from 'react-router-dom';
import DashboardOwnerPage from '../pages/DashboardOwnerPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx';
import AdminLoginPage from '../pages/AdminLoginPage.jsx';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import AdminDashboard from '../components/admin/AdminDashboard.jsx';
import AdminUsersPage from '../components/admin/AdminUsersPage.jsx';
import AdminDocumentsPage from '../components/admin/AdminDocumentsPage.jsx';
import AdminPublicationPage from '../components/admin/AdminPublicationPage.jsx';
import AdminBookingsPage from '../components/admin/AdminBookingsPage.jsx';
import AdminCommentsPage from '../components/admin/AdminCommentsPage.jsx';
import AdminPlaceholder from '../components/admin/AdminPlaceholder.jsx';
import AdminCreateUserPage from '../pages/AdminCreateUserPage.jsx';
import AccountPage from '../pages/AccountPage.jsx';
import MyDocumentsPage from '../pages/MyDocumentsPage.jsx';
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
      <Route
        path="/account"
        element={
          <RequireRole>
            <AccountPage />
          </RequireRole>
        }
      />
      <Route
        path="/documents"
        element={
          <RequireRole role={['locataire', 'proprietaire']}>
            <MyDocumentsPage />
          </RequireRole>
        }
      />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireRole role="admin" redirectTo="/admin/login">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="spectateur" element={<AdminPlaceholder title="Vue spectateur" />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/new" element={<AdminCreateUserPage />} />
        <Route path="comments" element={<AdminCommentsPage />} />
        <Route path="publications" element={<AdminPublicationPage />} />
        <Route path="documents" element={<AdminDocumentsPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="ports" element={<AdminPlaceholder title="Ports" />} />
        <Route path="transactions" element={<AdminPlaceholder title="Transaction" />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
