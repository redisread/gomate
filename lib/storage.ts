import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

/**
 * Cloudflare R2 Storage Client
 *
 * R2 is S3-compatible object storage used for:
 * - Location cover images
 * - User avatars
 * - Other static assets
 *
 * Supports dual-mode access:
 * - Cloudflare Workers: Uses env.R2 binding (preferred)
 * - Local development: Uses S3 SDK with R2 credentials
 */

// R2 access mode
type R2ClientMode =
  | { type: 'binding'; r2: R2Bucket }
  | { type: 's3'; client: S3Client; bucketName: string };

/**
 * Get R2 client based on runtime environment
 * - Cloudflare Workers: Uses env.R2 binding
 * - Local development: Uses S3 SDK
 */
async function getR2Client(): Promise<R2ClientMode> {
  // Try Cloudflare Workers environment first
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    if (env.R2) {
      return { type: 'binding', r2: env.R2 as R2Bucket };
    }
  } catch {
    // Not in Workers environment, fall back to S3 SDK
  }

  // Local development - use S3 SDK
  const R2_ENDPOINT = process.env.R2_ENDPOINT;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "gomate";

  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "R2 environment variables (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not configured for local development."
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  return { type: 's3', client, bucketName: R2_BUCKET_NAME };
}

/**
 * Get R2 public URL from environment
 */
function getR2PublicUrl(): string {
  return process.env.R2_PUBLIC_URL || "https://gomate.cos.jiahongw.com";
}

// Image upload options
export interface UploadImageOptions {
  folder?: "locations" | "avatars" | "temp";
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

// Upload result
export interface UploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

/**
 * Compress and optimize image using Sharp
 */
async function compressImage(
  buffer: Buffer,
  options: UploadImageOptions
): Promise<{ buffer: Buffer; width: number; height: number; format: string }> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    format = "webp",
  } = options;

  let sharpInstance = sharp(buffer);

  // Get metadata
  const metadata = await sharpInstance.metadata();

  // Resize if needed
  if (
    (metadata.width && metadata.width > maxWidth) ||
    (metadata.height && metadata.height > maxHeight)
  ) {
    sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert format and compress
  switch (format) {
    case "jpeg":
    case "jpg":
      sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
      break;
    case "png":
      sharpInstance = sharpInstance.png({
        quality,
        progressive: true,
        compressionLevel: 9,
      });
      break;
    case "webp":
    default:
      sharpInstance = sharpInstance.webp({ quality, effort: 6 });
      break;
  }

  const processedBuffer = await sharpInstance.toBuffer();
  const processedMetadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    width: processedMetadata.width || 0,
    height: processedMetadata.height || 0,
    format: processedMetadata.format || format,
  };
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
 * @param file - File buffer or Blob
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
  const r2Mode = await getR2Client();
  const folder = options.folder || "temp";

  // Convert ArrayBuffer to Buffer if needed
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

  // Compress image
  const compressed = await compressImage(buffer, options);

  // Generate file key
  const key = generateFileKey(folder, fileName, compressed.format);

  // Upload based on mode
  if (r2Mode.type === 'binding') {
    // Use R2 binding (Cloudflare Workers)
    await r2Mode.r2.put(key, compressed.buffer, {
      httpMetadata: {
        contentType: `image/${compressed.format}`,
        cacheControl: "public, max-age=31536000",
      },
    });
  } else {
    // Use S3 SDK (local development)
    const command = new PutObjectCommand({
      Bucket: r2Mode.bucketName,
      Key: key,
      Body: compressed.buffer,
      ContentType: `image/${compressed.format}`,
      CacheControl: "public, max-age=31536000",
    });
    await r2Mode.client.send(command);
  }

  // Generate URLs
  const publicUrl = `${getR2PublicUrl()}/${key}`;

  return {
    key,
    url: publicUrl,
    publicUrl,
    size: compressed.buffer.length,
    width: compressed.width,
    height: compressed.height,
    format: compressed.format,
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
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: "webp",
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
    maxWidth: 400,
    maxHeight: 400,
    quality: 80,
    format: "webp",
  });
}

/**
 * Generate a presigned URL for temporary access to a private object
 *
 * NOTE: Only available in S3 SDK mode (local development)
 * R2 binding in Cloudflare Workers does not support presigned URLs
 *
 * @param key - Object key in R2
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Presigned URL string
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const r2Mode = await getR2Client();

  if (r2Mode.type === 'binding') {
    // R2 binding does not support presigned URLs
    // Return public URL instead (assuming bucket is public)
    console.warn("Presigned URLs are not supported in R2 binding mode. Returning public URL.");
    return `${getR2PublicUrl()}/${key}`;
  }

  // S3 SDK mode
  const command = new GetObjectCommand({
    Bucket: r2Mode.bucketName,
    Key: key,
  });

  return getSignedUrl(r2Mode.client, command, { expiresIn });
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
  const r2Mode = await getR2Client();

  if (r2Mode.type === 'binding') {
    // Use R2 binding
    await r2Mode.r2.delete(key);
  } else {
    // Use S3 SDK
    const command = new DeleteObjectCommand({
      Bucket: r2Mode.bucketName,
      Key: key,
    });
    await r2Mode.client.send(command);
  }
}

/**
 * Extract key from a full R2 URL
 */
export function extractKeyFromUrl(url: string): string | null {
  const publicUrl = getR2PublicUrl();

  if (url.startsWith(publicUrl)) {
    return url.substring(publicUrl.length + 1); // +1 for the trailing slash
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

// Legacy export for backward compatibility (deprecated)
// This creates a new S3 client on demand for local development
export const r2Client = {
  async send(command: PutObjectCommand | GetObjectCommand | DeleteObjectCommand) {
    const mode = await getR2Client();
    if (mode.type === 's3') {
      return mode.client.send(command);
    }
    throw new Error("Direct r2Client.send() is not supported in R2 binding mode. Use uploadImage/deleteImage instead.");
  }
};