import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';

function RequireRole({ role, redirectTo = '/', children }) {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const allowed = !loading && user && (!role || user.role === role);

  useEffect(() => {
    if (loading || allowed) return;

    if (!user) {
      showToast('Vous devez être connecté pour accéder à cette page.', 'error');
      navigate(redirectTo, { replace: true });
    } else if (role && user.role !== role) {
      showToast("Accès refusé : vous n'avez pas les droits requis.", 'error');
      navigate(redirectTo, { replace: true });
    }
  }, [loading, allowed, user, role, redirectTo, navigate, showToast]);

  if (loading || !allowed) return null;
  return children;
}

export default RequireRole;
