import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import CategoryPage from '../pages/CategoryPage.jsx';
import ProductPage from '../pages/ProductPage.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import AboutPage from '../pages/AboutPage.jsx';
import MentionsLegalesPage from '../pages/legal/MentionsLegalesPage.jsx';
import CguPage from '../pages/legal/CguPage.jsx';
import CgvPage from '../pages/legal/CgvPage.jsx';
import ConfidentialitePage from '../pages/legal/ConfidentialitePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx';
import AdminLoginPage from '../pages/AdminLoginPage.jsx';

// Espace admin chargé à la demande : ses 15 pages (et recharts, utilisé par le
// dashboard) sortent du bundle principal téléchargé par tous les visiteurs.
const AdminLayout = lazy(() => import('../components/admin/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard.jsx'));
const AdminUsersPage = lazy(() => import('../components/admin/AdminUsersPage.jsx'));
const AdminDocumentsPage = lazy(() => import('../components/admin/AdminDocumentsPage.jsx'));
const AdminPublicationPage = lazy(() => import('../components/admin/AdminPublicationPage.jsx'));
const AdminBookingsPage = lazy(() => import('../components/admin/AdminBookingsPage.jsx'));
const AdminCommentsPage = lazy(() => import('../components/admin/AdminCommentsPage.jsx'));
const AdminPortsPage = lazy(() => import('../components/admin/AdminPortsPage.jsx'));
const AdminTransactionsPage = lazy(() => import('../components/admin/AdminTransactionsPage.jsx'));
const AdminMessagesPage = lazy(() => import('../components/admin/AdminMessagesPage.jsx'));
const AdminContactPage = lazy(() => import('../components/admin/AdminContactPage.jsx'));
const AdminAccountPage = lazy(() => import('../components/admin/AdminAccountPage.jsx'));
const AdminSpectateurLocatairePage = lazy(
  () => import('../components/admin/AdminSpectateurLocatairePage.jsx')
);
const AdminSpectateurProprietairePage = lazy(
  () => import('../components/admin/AdminSpectateurProprietairePage.jsx')
);
const AdminCreateUserPage = lazy(() => import('../pages/AdminCreateUserPage.jsx'));

// Chaque page admin a sa propre frontière Suspense : pendant le chargement du
// chunk, seule la zone de contenu est vide, la mise en page reste affichée.
const suspended = (element) => <Suspense fallback={null}>{element}</Suspense>;
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
import ReservationPage from '../pages/ReservationPage.jsx';
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
      <Route path="/product" element={<ProductPage />} />
      <Route path="/product/:id" element={<ProductPage />} />
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
        path="/reservation/:idBoat"
        element={
          <RequireRole role="locataire">
            <ReservationPage />
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
            {suspended(<AdminLayout />)}
          </RequireRole>
        }
      >
        <Route index element={suspended(<AdminDashboard />)} />
        <Route path="spectateur" element={suspended(<AdminSpectateurLocatairePage />)} />
        <Route
          path="spectateur/proprietaire"
          element={suspended(<AdminSpectateurProprietairePage />)}
        />
        <Route path="users" element={suspended(<AdminUsersPage />)} />
        <Route path="users/new" element={suspended(<AdminCreateUserPage />)} />
        <Route path="comments" element={suspended(<AdminCommentsPage />)} />
        <Route path="publications" element={suspended(<AdminPublicationPage />)} />
        <Route path="documents" element={suspended(<AdminDocumentsPage />)} />
        <Route path="bookings" element={suspended(<AdminBookingsPage />)} />
        <Route path="ports" element={suspended(<AdminPortsPage />)} />
        <Route path="transactions" element={suspended(<AdminTransactionsPage />)} />
        <Route path="messages" element={suspended(<AdminMessagesPage />)} />
        <Route path="contact" element={suspended(<AdminContactPage />)} />
        <Route path="compte" element={suspended(<AdminAccountPage />)} />
      </Route>
      {/* Attrape-tout : toute route inconnue affiche la page 404. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
