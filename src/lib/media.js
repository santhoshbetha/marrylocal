/**
 * Public media origin for profile photos.
 *
 * Set `VITE_MEDIA_BASE_URL` to the R2/CDN public bucket. Legacy Supabase storage
 * URLs are never compiled into the client.
 */
export const MEDIA_BASE_URL = String(import.meta.env.VITE_MEDIA_BASE_URL || '').replace(/\/+$/, '');

export function mediaUrl(shortid, image) {
  if (!image) return null;
  if (String(image).startsWith('http')) return image;
  if (!MEDIA_BASE_URL) return image;
  return `${MEDIA_BASE_URL}/${shortid}/${image}`;
}

export default mediaUrl;
