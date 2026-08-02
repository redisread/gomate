export function getShareImageErrorMessage(payload: unknown, status: number): string {
  if (typeof payload !== "object" || payload === null) {
    return `Failed to generate image: ${status}`;
  }

  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return `Failed to generate image: ${status}`;
}

export async function readShareImageBlob(response: Response): Promise<Blob> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
    const payload = await response.json().catch(() => null);
    throw new Error(getShareImageErrorMessage(payload, response.status));
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("Generated image is empty");
  }

  return blob;
}
