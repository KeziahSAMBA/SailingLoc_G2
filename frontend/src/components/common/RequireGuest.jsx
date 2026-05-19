import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

function RequireGuest({ redirectTo = '/', children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    navigate(redirectTo, { replace: true });
  }, [loading, user, redirectTo, navigate]);

  if (loading || user) return null;
  return children;
}

export default RequireGuest;