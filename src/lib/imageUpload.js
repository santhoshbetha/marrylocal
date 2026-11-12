/**
 * Converts the Blob produced by the crop canvas into a named File and wraps it
 * in the multipart envelope expected by `POST /api/v1/profiles/me/avatar`.
 *
 * The browser must own the multipart boundary, so callers deliberately do not
 * set a `Content-Type` header on the Axios request.
 */
export function toUploadFile(payload, { name } = {}) {
  if (!payload) {
    throw new Error('No image was provided for upload.');
  }

  if (typeof File !== 'undefined' && payload instanceof File) {
    return payload;
  }

  const type = payload.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const extension = type === 'image/png' ? 'png' : 'jpg';
  const filename = name || `photo-${Date.now()}.${extension}`;

  return new File([payload], filename, { type });
}

export function buildAvatarFormData(payload, options) {
  const file = toUploadFile(payload, options);
  const form = new FormData();
  form.append('avatar', file, file.name);
  return form;
}
