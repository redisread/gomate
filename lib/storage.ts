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
 */

// R2 Client Configuration
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "gomate";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Validate required environment variables
if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn(
    "R2 environment variables are not fully configured. Storage operations will fail."
  );
}

// Initialize S3 client for R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

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
  const folder = options.folder || "temp";

  // Convert ArrayBuffer to Buffer if needed
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

  // Compress image
  const compressed = await compressImage(buffer, options);

  // Generate file key
  const key = generateFileKey(folder, fileName, compressed.format);

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: compressed.buffer,
    ContentType: `image/${compressed.format}`,
    CacheControl: "public, max-age=31536000", // 1 year cache
  });

  await r2Client.send(command);

  // Generate URLs
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

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
 * @param key - Object key in R2
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Presigned URL string
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get the public URL for an object
 */
export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete an object from R2 storage
 *
 * @param key - Object key to delete
 */
export async function deleteImage(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Extract key from a full R2 URL
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!R2_PUBLIC_URL) return null;

  if (url.startsWith(R2_PUBLIC_URL)) {
    return url.substring(R2_PUBLIC_URL.length + 1); // +1 for the trailing slash
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
