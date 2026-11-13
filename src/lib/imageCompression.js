/**
 * Client-side image normalization for KYC documents.
 *
 * Decoding and re-encoding through a canvas caps the pixel dimensions, lowers
 * the byte size before the mobile upload, and strips EXIF/GPS metadata from the
 * original camera file. The server still validates the real file size and type.
 */

const DEFAULTS = {
  maxDimension: 2000,
  quality: 0.88,
  maxBytes: 7 * 1024 * 1024,
  mimeType: 'image/jpeg',
};

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the Image element path for formats the bitmap decoder
      // does not handle in this browser.
    }
  }

  const url = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('That image could not be read.'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(image, width, height, mimeType, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Your browser could not prepare this image.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('The image could not be encoded.'))),
      mimeType,
      quality,
    );
  });
}

export async function compressImage(file, options = {}) {
  if (!file) {
    throw new Error('No image was provided.');
  }

  const config = { ...DEFAULTS, ...options };
  const image = await decode(file);
  const sourceWidth = image.width ?? image.naturalWidth;
  const sourceHeight = image.height ?? image.naturalHeight;

  const scale = Math.min(1, config.maxDimension / Math.max(sourceWidth, sourceHeight));

  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  let quality = config.quality;
  let blob = await encode(image, width, height, config.mimeType, quality);

  while (blob.size > config.maxBytes && quality > 0.6) {
    quality -= 0.1;
    blob = await encode(image, width, height, config.mimeType, quality);
  }

  if (image.close) image.close();

  if (blob.size > config.maxBytes) {
    throw new Error('This image is still too large after compression. Choose a smaller image.');
  }

  const baseName = (file.name || 'document').replace(/\.[^.]+$/, '');

  return new File([blob], `${baseName}.jpg`, {
    type: config.mimeType,
    lastModified: Date.now(),
  });
}

export default compressImage;
