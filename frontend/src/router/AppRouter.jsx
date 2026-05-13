import { Routes, Route, Navigate } from "react-router-dom";
import DashboardOwnerPage from "../pages/DashboardOwnerPage.jsx";
import { useAuth } from "../hooks/useAuth.jsx";

function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<DashboardOwnerPage />} />
      <Route
        path="/dashboard"
        element={user ? <DashboardOwnerPage /> : <Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default AppRouter;
