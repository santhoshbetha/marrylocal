import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function isValidLookupQuery(value) {
  const query = String(value || '').trim();

  if (!query) return false;

  if (query.startsWith('@')) {
    return /^[A-Za-z][A-Za-z0-9_]{2,29}$/.test(query.slice(1));
  }

  if (query.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
  }

  // A leading letter means a user handle; everything else falls through to the
  // normalized 10-digit phone check.
  if (/^[A-Za-z]/.test(query)) {
    return /^[A-Za-z][A-Za-z0-9_]{2,29}$/.test(query);
  }

  const digits = query.replace(/\D/g, '');
  return digits.length === 10;
}

export function useProfileLookup(query, enabled = false) {
  const normalized = String(query || '').trim();

  return useQuery({
    queryKey: ['profiles', 'lookup', normalized],
    queryFn: async ({ signal }) => {
      try {
        const response = await apiClient.get('/api/v1/profiles/lookup', {
          params: { query: normalized },
          signal,
        });

        return response.data?.data?.profile ?? null;
      } catch (error) {
        // A privacy-gated miss is intentionally indistinguishable from a
        // non-existent profile, so render it as an empty result rather than a
        // transport error.
        if (error?.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(enabled && normalized),
    retry: false,
    // Keep administrative lookup results warm long enough for the
    // profile -> Back navigation loop to hydrate from cache instead of
    // re-querying the API.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export default useProfileLookup;
