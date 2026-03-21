/** 生成 R2 文件存储路径 key */
function generateFileKey(folder: string, originalName: string, format: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase()
    .substring(0, 30);
  return `${folder}/${timestamp}-${random}-${sanitizedName}.${format}`;
}

function detectFormat(contentType: string): string {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  return "jpeg";
}

function getContentType(format: string): string {
  switch (format) {
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    default: return "image/jpeg";
  }
}

export interface UploadResult {
  key: string;
  publicUrl: string;
  size: number;
  format: string;
}

/**
 * 上传图片到 R2
 */
export async function uploadImage(
  r2: R2Bucket,
  file: ArrayBuffer,
  fileName: string,
  contentType: string,
  folder: "locations" | "avatars" | "temp",
  r2PublicUrl: string
): Promise<UploadResult> {
  const format = detectFormat(contentType);
  const key = generateFileKey(folder, fileName, format);
  const uint8Array = new Uint8Array(file);

  await r2.put(key, uint8Array, {
    httpMetadata: {
      contentType: getContentType(format),
      cacheControl: "public, max-age=31536000",
    },
  });

  return {
    key,
    publicUrl: `${r2PublicUrl}/${key}`,
    size: uint8Array.length,
    format,
  };
}

/**
 * 从 R2 删除文件
 */
export async function deleteFile(r2: R2Bucket, key: string): Promise<void> {
  await r2.delete(key);
}
