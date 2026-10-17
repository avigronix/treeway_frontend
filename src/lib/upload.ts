// Upload checks (jpg/png/webp/pdf, at most 5 MB), the same as the backend's save_upload. No zod here on purpose:
// FilePicker is in the ui barrel that every page loads.
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Returns an error message, or null when the file is fine (jpg/png/webp/pdf, at most 5 MB).
 * imagesOnly: public pictures (company QR, banners, products) must not be a PDF (backend images_only).
 */
export function checkUploadFile(file: File, imagesOnly = false): string | null {
  const types: readonly string[] = imagesOnly ? IMAGE_TYPES : UPLOAD_TYPES;
  if (!types.includes(file.type))
    return imagesOnly ? 'Use a JPG, PNG or WEBP picture.' : 'Use a JPG, PNG, WEBP or PDF file.';
  if (file.size > UPLOAD_MAX_BYTES) return 'File is too big. Use a file under 5 MB.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}
