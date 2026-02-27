/**
 * Cloudflare R2 Storage Client
 *
 * R2 is S3-compatible object storage used for:
 * - Location cover images
 * - User avatars
 * - Other static assets
 *
 * Uses env.R2 binding in both Cloudflare Workers and local development
 * (local dev simulates R2 via initOpenNextCloudflareForDev)
 */

// Image upload options
export interface UploadImageOptions {
  folder?: "locations" | "avatars" | "temp";
  format?: "jpeg" | "png" | "webp" | "original";
}

// Upload result
export interface UploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
  format: string;
}

/**
 * Get R2 bucket binding from Cloudflare context
 */
async function getR2Bucket(): Promise<R2Bucket> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext();

  if (!env.R2) {
    throw new Error("R2 storage not configured. Make sure R2 binding is set in wrangler.toml");
  }

  return env.R2 as R2Bucket;
}

/**
 * Get R2 public URL from environment
 */
function getR2PublicUrl(): string {
  return process.env.R2_PUBLIC_URL || "https://gomate.cos.jiahongw.com";
}

/**
 * Detect image format from content type
 */
function detectFormat(contentType: string): string {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpeg";
  return "jpeg"; // Default fallback
}

/**
 * Get content type from format
 */
function getContentType(format: string): string {
  switch (format) {
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "jpeg":
    default: return "image/jpeg";
  }
}

/**
 * Generate a unique file key for storage
 */
function generateFileKey(
  folder: string,
  originalName: string,
  format: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase()
    .substring(0, 30);

  return `${folder}/${timestamp}-${random}-${sanitizedName}.${format}`;
}

/**
 * Upload an image to R2 storage
 *
 * @param file - File buffer or ArrayBuffer
 * @param fileName - Original file name
 * @param contentType - MIME type of the file
 * @param options - Upload options
 * @returns Upload result with URLs and metadata
 */
export async function uploadImage(
  file: Buffer | ArrayBuffer,
  fileName: string,
  contentType: string,
  options: UploadImageOptions = {}
): Promise<UploadResult> {
  const r2 = await getR2Bucket();
  const folder = options.folder || "temp";

  // Convert to Uint8Array for R2 (Cloudflare Workers use native Web APIs, not Node.js Buffer)
  const uint8Array = Buffer.isBuffer(file)
    ? new Uint8Array(file)
    : new Uint8Array(file);

  // Determine format
  const format = options.format === "original" || !options.format
    ? detectFormat(contentType)
    : options.format;

  // Generate file key
  const key = generateFileKey(folder, fileName, format);

  // Determine content type for upload
  const uploadContentType = getContentType(format);

  // Upload to R2
  await r2.put(key, uint8Array, {
    httpMetadata: {
      contentType: uploadContentType,
      cacheControl: "public, max-age=31536000",
    },
  });

  // Generate URLs
  const publicUrl = `${getR2PublicUrl()}/${key}`;

  return {
    key,
    url: publicUrl,
    publicUrl,
    size: uint8Array.length,
    format,
  };
}

/**
 * Upload a location cover image
 */
export async function uploadLocationCover(
  file: Buffer | ArrayBuffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  return uploadImage(file, fileName, contentType, {
    folder: "locations",
    format: "original",
  });
}

/**
 * Upload a user avatar
 */
export async function uploadUserAvatar(
  file: Buffer | ArrayBuffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  return uploadImage(file, fileName, contentType, {
    folder: "avatars",
    format: "original",
  });
}

/**
 * Get the public URL for an object
 */
export function getPublicUrl(key: string): string {
  return `${getR2PublicUrl()}/${key}`;
}

/**
 * Delete an object from R2 storage
 *
 * @param key - Object key to delete
 */
export async function deleteImage(key: string): Promise<void> {
  const r2 = await getR2Bucket();
  await r2.delete(key);
}

/**
 * Extract key from a full R2 URL
 */
export function extractKeyFromUrl(url: string): string | null {
  const publicUrl = getR2PublicUrl();

  if (url.startsWith(publicUrl)) {
    return url.substring(publicUrl.length + 1); // +1 for the trailing slash
  }

  // Also handle local dev URLs
  if (url.startsWith("/api/r2/")) {
    return url.substring("/api/r2/".length);
  }

  return null;
}

/**
 * Delete an image by its public URL
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  const key = extractKeyFromUrl(url);
  if (key) {
    await deleteImage(key);
  }
}