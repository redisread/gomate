import { isImageUploadReason } from "@/contracts/image-upload";
import { API_BASE } from "@/lib/api";

export const LOCATION_IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const LOCATION_IMAGE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
].join(",");

type ImageFamily = "jpeg" | "png" | "gif" | "webp" | "heic";

const MIME_FAMILY: Record<string, ImageFamily> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

const EXTENSION_FAMILY: Record<string, ImageFamily> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  gif: "gif",
  webp: "webp",
  heic: "heic",
  heif: "heic",
};

export type LocationImageUploadErrorCode =
  | "unsupported_format"
  | "invalid_image_content"
  | "image_conversion_failed"
  | "file_too_large"
  | "upload_rejected"
  | "auth_required"
  | "server_error"
  | "invalid_response"
  | "network_error";

export class LocationImageUploadError extends Error {
  constructor(readonly code: LocationImageUploadErrorCode) {
    super(code);
    this.name = "LocationImageUploadError";
  }
}

function fileExtension(file: File) {
  return file.name.match(/\.([A-Za-z0-9]+)$/u)?.[1]?.toLowerCase() ?? null;
}

function validateLocationImage(file: File) {
  if (file.size > LOCATION_IMAGE_MAX_FILE_SIZE) {
    throw new LocationImageUploadError("file_too_large");
  }
  const extension = fileExtension(file);
  const mimeFamily = MIME_FAMILY[file.type];
  const extensionFamily = extension ? EXTENSION_FAMILY[extension] : undefined;
  if (!mimeFamily && !extensionFamily) {
    throw new LocationImageUploadError("unsupported_format");
  }
}

function rejectionCode(status: number, responseText: string): LocationImageUploadErrorCode {
  let reason: unknown;
  try {
    const payload = JSON.parse(responseText) as {
      error?: { details?: { reason?: unknown } };
    };
    reason = payload.error?.details?.reason;
  } catch {
    // Status mapping below remains a safe fallback for non-JSON responses.
  }

  if (isImageUploadReason(reason)) {
    if (reason === "unsupported_image_format") return "unsupported_format";
    if (reason === "invalid_image_content") return "invalid_image_content";
    if (reason === "image_conversion_failed") return "image_conversion_failed";
    if (reason === "file_too_large") return "file_too_large";
    return "upload_rejected";
  }
  if (status === 401 || status === 403) return "auth_required";
  if (status === 413) return "file_too_large";
  if (status >= 500) return "server_error";
  return "upload_rejected";
}

export async function uploadLocationImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  validateLocationImage(file);

  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new LocationImageUploadError(rejectionCode(xhr.status, xhr.responseText)));
        return;
      }
      try {
        const payload = JSON.parse(xhr.responseText) as { url?: unknown };
        if (typeof payload.url === "string" && payload.url.length > 0) {
          resolve(payload.url);
          return;
        }
      } catch {
        // The typed invalid-response error below is more useful than the parser error.
      }
      reject(new LocationImageUploadError("invalid_response"));
    });
    xhr.addEventListener("error", () => {
      reject(new LocationImageUploadError("network_error"));
    });
    xhr.addEventListener("abort", () => {
      reject(new LocationImageUploadError("network_error"));
    });
    xhr.open("POST", `${API_BASE}/upload/location`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

type UploadTranslationKey =
  | "ui.upload.invalidType"
  | "ui.upload.invalidImageContent"
  | "ui.upload.imageConversionFailed"
  | "ui.upload.fileTooLarge"
  | "ui.upload.uploadRejected"
  | "ui.upload.uploadAuthError"
  | "ui.upload.uploadServerError"
  | "ui.upload.uploadInvalidResponse"
  | "ui.upload.uploadNetworkError"
  | "ui.upload.uploadUnknownError";

export function locationImageUploadMessage(
  error: unknown,
  translate: (key: UploadTranslationKey, values?: { size: string }) => string,
) {
  if (!(error instanceof LocationImageUploadError)) {
    return translate("ui.upload.uploadUnknownError");
  }
  switch (error.code) {
    case "unsupported_format":
      return translate("ui.upload.invalidType");
    case "invalid_image_content":
      return translate("ui.upload.invalidImageContent");
    case "image_conversion_failed":
      return translate("ui.upload.imageConversionFailed");
    case "file_too_large":
      return translate("ui.upload.fileTooLarge", { size: "5" });
    case "upload_rejected":
      return translate("ui.upload.uploadRejected");
    case "auth_required":
      return translate("ui.upload.uploadAuthError");
    case "server_error":
      return translate("ui.upload.uploadServerError");
    case "invalid_response":
      return translate("ui.upload.uploadInvalidResponse");
    case "network_error":
      return translate("ui.upload.uploadNetworkError");
  }
}
