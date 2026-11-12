import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { buildAvatarFormData } from '@/lib/imageUpload';

export const PROFILE_ME_KEY = ['profile', 'me'];

export function useProfileQuery(enabled = true) {
  return useQuery({
    queryKey: PROFILE_ME_KEY,
    queryFn: async () => {
      const response = await api.get('/api/v1/profiles/me');
      return response.data?.data?.profile || null;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async profile => {
      const response = await api.patch('/api/v1/profiles/me', { profile });
      return response.data?.data?.profile || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_KEY });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'discovery'] });
    },
  });
}

export function useAvatarUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async payload => {
      // Accepts the JPEG Blob from ImageUploader as well as a raw File.
      // Let the browser set the multipart boundary; a manual Content-Type
      // header without a boundary makes Plug.Parsers reject the body.
      const form = buildAvatarFormData(payload);

      const response = await api.post('/api/v1/profiles/me/avatar', form);

      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_KEY });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'discovery'] });
    },
  });
}

export default useProfileQuery;
