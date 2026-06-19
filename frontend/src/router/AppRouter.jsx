import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
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
import AdminPortsPage from '../components/admin/AdminPortsPage.jsx';
import AdminTransactionsPage from '../components/admin/AdminTransactionsPage.jsx';
import AdminSpectateurPage from '../components/admin/AdminSpectateurPage.jsx';
import AdminCreateUserPage from '../pages/AdminCreateUserPage.jsx';
import LocataireLayout from '../components/locataire/LocataireLayout.jsx';
import LocataireDashboard from '../components/locataire/LocataireDashboard.jsx';
import LocataireAccount from '../components/locataire/LocataireAccount.jsx';
import LocataireDocuments from '../components/locataire/LocataireDocuments.jsx';
import AccountPage from '../pages/AccountPage.jsx';
import MyDocumentsPage from '../pages/MyDocumentsPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx';
import RequireRole from '../components/common/RequireRole.jsx';
import RequireGuest from '../components/common/RequireGuest.jsx';

function AppRouter({ location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<HomePage />} />
      <Route path="/register" element={<HomePage />} />
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
      <Route
        path="/locataire"
        element={
          <RequireRole role="locataire">
            <LocataireLayout />
          </RequireRole>
        }
      >
        <Route index element={<LocataireDashboard />} />
        <Route path="compte" element={<LocataireAccount />} />
        <Route path="documents" element={<LocataireDocuments />} />
        {/* Les autres pages (Mes réservations, Mes favoris) seront ajoutées ultérieurement. */}
      </Route>
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
        <Route path="spectateur" element={<AdminSpectateurPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/new" element={<AdminCreateUserPage />} />
        <Route path="comments" element={<AdminCommentsPage />} />
        <Route path="publications" element={<AdminPublicationPage />} />
        <Route path="documents" element={<AdminDocumentsPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="ports" element={<AdminPortsPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
