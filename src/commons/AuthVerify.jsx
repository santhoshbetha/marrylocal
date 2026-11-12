import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Session guard for the opaque bearer-token era.
 *
 * There is no JWT to decode. Expiration and revocation are enforced by the
 * server; the Axios interceptor clears the local session on a 401.
 */
export function AuthVerify() {
  const location = useLocation();
  const token = useAuthStore(state => state.token);
  const clearSession = useAuthStore(state => state.clearSession);

  useEffect(() => {
    if (token === null && location.pathname.startsWith('/dashboard')) {
      clearSession();
    }
  }, [token, location.pathname, clearSession]);

  return null;
}

export default AuthVerify;
