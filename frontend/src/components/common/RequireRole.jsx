import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';

function RequireRole({ role, redirectTo = '/', children }) {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // `role` peut être une chaîne ou un tableau de rôles autorisés.
  const roleOk = (r) => (Array.isArray(role) ? role.includes(r) : r === role);
  const allowed = !loading && user && (!role || roleOk(user.role));

  useEffect(() => {
    if (loading || allowed) return;

    if (!user) {
      showToast('Vous devez être connecté pour accéder à cette page.', 'error');
      navigate(redirectTo, { replace: true });
    } else if (role && !roleOk(user.role)) {
      showToast("Accès refusé : vous n'avez pas les droits requis.", 'error');
      navigate(redirectTo, { replace: true });
    }
  }, [loading, allowed, user, role, redirectTo, navigate, showToast]);

  if (loading || !allowed) return null;
  return children;
}

export default RequireRole;
