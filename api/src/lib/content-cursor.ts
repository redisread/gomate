export interface ContentCursor {
  t: number;
  id: string;
}

const MAX_CURSOR_LENGTH = 512;
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

function toBase64Url(value: string): string {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(`${normalized}${padding}`);
}

export function encodeContentCursor(cursor: ContentCursor): string {
  return toBase64Url(JSON.stringify(cursor));
}

export function decodeContentCursor(value: string): ContentCursor | null {
  if (
    !value ||
    value.length > MAX_CURSOR_LENGTH ||
    !/^[A-Za-z0-9_-]+$/u.test(value)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(value)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;

    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.t !== "number" ||
      !Number.isSafeInteger(candidate.t) ||
      candidate.t < 0 ||
      candidate.t > MAX_DATE_TIMESTAMP ||
      typeof candidate.id !== "string" ||
      candidate.id.length === 0 ||
      candidate.id.length > 200
    ) {
      return null;
    }

    return { t: candidate.t, id: candidate.id };
  } catch {
    return null;
  }
}
