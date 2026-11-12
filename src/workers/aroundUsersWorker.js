import { api } from '@/api/client';

/**
 * Counts opposite-gender members inside a radius using the PostGIS discovery
 * endpoint. This replaces the old Supabase worker that queried `profiles`.
 */
export default async function aroundUsersWorker({ searchdistance = 50 } = {}) {
  try {
    const response = await api.get('/api/v1/profiles/discovery', {
      params: { page: 1, per_page: 1, radius_km: searchdistance },
    });
    return response.data?.data?.pagination?.total ?? 0;
  } catch {
    return 0;
  }
}
