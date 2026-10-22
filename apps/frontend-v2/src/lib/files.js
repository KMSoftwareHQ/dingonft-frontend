export const MAX_CONTENT_SIZE = 10 * 1e6; // 10 MB, as the provider enforces.
export const MAX_PREVIEW_SIZE = 1 * 1e6; // 1 MB.

const startsWith = (bytes, signature, offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

export const isPng = (bytes) =>
  startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const isWebp = (bytes) =>
  bytes.length >= 12 &&
  startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
  startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);

export const formatBytes = (bytes) =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

// Returns an error message, or "" when the content file is acceptable.
export const validateContent = (file) => {
  if (!file) {
    return "Choose the original file";
  }
  if (file.size === 0) {
    return "The file is empty";
  }
  if (file.size > MAX_CONTENT_SIZE) {
    return `The file is ${formatBytes(file.size)}; the limit is 10 MB`;
  }
  return "";
};

// Same rules as the provider: square PNG or WEBP up to 1 MB.
export const validateCover = async (file) => {
  if (!file) {
    return "Choose a cover image";
  }
  if (file.size > MAX_PREVIEW_SIZE) {
    return `The cover is ${formatBytes(file.size)}; the limit is 1 MB`;
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!isPng(header) && !isWebp(header)) {
    return "The cover must be a PNG or WEBP image";
  }
  try {
    const image = await createImageBitmap(file);
    const { width, height } = image;
    image.close();
    if (width === 0 || width !== height) {
      return `The cover must be square (this one is ${width}×${height})`;
    }
  } catch {
    return "The cover image couldn't be read";
  }
  return "";
};

export const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
