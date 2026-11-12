export function validateProfileImage(file, options = {}) {
  const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default ceiling
  const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'];

  if (!file) throw new Error('No file selected.');

  // 1. Enforce strict type checking parameters
  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `Format error. Allowed file formats are: ${allowedTypes
        .map(t => t.replace('image/', ''))
        .join(', ')}`,
    );
  }

  // 2. Enforce byte allocation constraints
  if (file.size > maxSize) {
    const sizeInMB = (maxSize / (1024 * 1024)).toFixed(0);
    throw new Error(`File is too large. Image parameters must fit inside a ${sizeInMB}MB limit.`);
  }

  return true;
}
