import { API_BASE_URL } from './client';
import { useAuthStore } from '@/store/authStore';

/**
 * Backwards-compatible URL/header helpers for legacy screens.
 * New code should import `api` from `@/api/client` directly.
 */
export const urlroot = API_BASE_URL;
export const url = `${API_BASE_URL}/api/v1`;

export const setHeaders = () => {
  const token = useAuthStore.getState().token;

  return {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
};

export default { urlroot, url, setHeaders };
