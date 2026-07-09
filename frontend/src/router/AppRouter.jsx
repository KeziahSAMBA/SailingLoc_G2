import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import CategoryPage from '../pages/CategoryPage.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import AboutPage from '../pages/AboutPage.jsx';
import MentionsLegalesPage from '../pages/legal/MentionsLegalesPage.jsx';
import CguPage from '../pages/legal/CguPage.jsx';
import CgvPage from '../pages/legal/CgvPage.jsx';
import ConfidentialitePage from '../pages/legal/ConfidentialitePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
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
import AdminMessagesPage from '../components/admin/AdminMessagesPage.jsx';
import AdminContactPage from '../components/admin/AdminContactPage.jsx';
import AdminAccountPage from '../components/admin/AdminAccountPage.jsx';
import AdminSpectateurLocatairePage from '../components/admin/AdminSpectateurLocatairePage.jsx';
import AdminSpectateurProprietairePage from '../components/admin/AdminSpectateurProprietairePage.jsx';
import AdminCreateUserPage from '../pages/AdminCreateUserPage.jsx';
import LocataireLayout from '../components/locataire/LocataireLayout.jsx';
import LocataireDashboard from '../components/locataire/LocataireDashboard.jsx';
import LocataireAccount from '../components/locataire/LocataireAccount.jsx';
import LocataireDocuments from '../components/locataire/LocataireDocuments.jsx';
import LocataireReservations from '../components/locataire/LocataireReservations.jsx';
import LocataireFavorites from '../components/locataire/LocataireFavorites.jsx';
import LocataireMessages from '../components/locataire/LocataireMessages.jsx';
import ProprietaireLayout from '../components/proprietaire/ProprietaireLayout.jsx';
import ProprietaireDashboard from '../components/proprietaire/ProprietaireDashboard.jsx';
import ProprietaireAccount from '../components/proprietaire/ProprietaireAccount.jsx';
import ProprietaireDocuments from '../components/proprietaire/ProprietaireDocuments.jsx';
import ProprietaireReservations from '../components/proprietaire/ProprietaireReservations.jsx';
import ProprietaireRevenus from '../components/proprietaire/ProprietaireRevenus.jsx';
import ProprietaireBoats from '../components/proprietaire/ProprietaireBoats.jsx';
import ProprietaireBoatForm from '../components/proprietaire/ProprietaireBoatForm.jsx';
import ProprietaireMessages from '../components/proprietaire/ProprietaireMessages.jsx';
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
      <Route path="/categorie" element={<CategoryPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/a-propos" element={<AboutPage />} />
      <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
      <Route path="/cgu" element={<CguPage />} />
      <Route path="/cgv" element={<CgvPage />} />
      <Route path="/politique-de-confidentialite" element={<ConfidentialitePage />} />
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
        <Route path="reservations" element={<LocataireReservations />} />
        <Route path="favoris" element={<LocataireFavorites />} />
        <Route path="messages" element={<LocataireMessages />} />
      </Route>
      <Route
        path="/proprietaire"
        element={
          <RequireRole role="proprietaire">
            <ProprietaireLayout />
          </RequireRole>
        }
      >
        <Route index element={<ProprietaireDashboard />} />
        <Route path="compte" element={<ProprietaireAccount />} />
        <Route path="documents" element={<ProprietaireDocuments />} />
        <Route path="reservations" element={<ProprietaireReservations />} />
        <Route path="revenus" element={<ProprietaireRevenus />} />
        <Route path="bateaux" element={<ProprietaireBoats />} />
        <Route path="bateaux/nouveau" element={<ProprietaireBoatForm />} />
        <Route path="bateaux/:id/modifier" element={<ProprietaireBoatForm />} />
        <Route path="messages" element={<ProprietaireMessages />} />
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
        <Route path="spectateur" element={<AdminSpectateurLocatairePage />} />
        <Route path="spectateur/proprietaire" element={<AdminSpectateurProprietairePage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/new" element={<AdminCreateUserPage />} />
        <Route path="comments" element={<AdminCommentsPage />} />
        <Route path="publications" element={<AdminPublicationPage />} />
        <Route path="documents" element={<AdminDocumentsPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="ports" element={<AdminPortsPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
        <Route path="messages" element={<AdminMessagesPage />} />
        <Route path="contact" element={<AdminContactPage />} />
        <Route path="compte" element={<AdminAccountPage />} />
      </Route>
      {/* Attrape-tout : toute route inconnue affiche la page 404. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
