export const IMAGE_UPLOAD_REASONS = [
  "unsupported_image_format",
  "invalid_image_content",
  "file_too_large",
  "invalid_upload_body",
  "missing_file",
] as const;

export type ImageUploadReason = typeof IMAGE_UPLOAD_REASONS[number];

export function isImageUploadReason(value: unknown): value is ImageUploadReason {
  return typeof value === "string" && IMAGE_UPLOAD_REASONS.some((reason) => reason === value);
}
