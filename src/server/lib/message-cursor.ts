export interface MessageCursor {
  t: number;
  id: string;
}

const INVALID_CURSOR = "INVALID_MESSAGE_CURSOR";
const MAX_ENCODED_CURSOR_LENGTH = 512;
const MAX_MESSAGE_ID_BYTES = 200;
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

export function encodeMessageCursor(cursor: MessageCursor): string {
  assertMessageCursor(cursor);
  return btoa(JSON.stringify(cursor)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function decodeMessageCursor(value: string): MessageCursor {
  try {
    if (
      !value ||
      value.length > MAX_ENCODED_CURSOR_LENGTH ||
      !/^[A-Za-z0-9_-]+$/u.test(value)
    ) {
      throw new Error(INVALID_CURSOR);
    }
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed: unknown = JSON.parse(atob(padded));
    assertMessageCursor(parsed);
    return parsed;
  } catch {
    throw new Error(INVALID_CURSOR);
  }
}

function assertMessageCursor(value: unknown): asserts value is MessageCursor {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    !Number.isSafeInteger((value as MessageCursor).t) ||
    (value as MessageCursor).t < 0 ||
    (value as MessageCursor).t > MAX_DATE_TIMESTAMP ||
    typeof (value as MessageCursor).id !== "string" ||
    (value as MessageCursor).id.length === 0 ||
    new TextEncoder().encode((value as MessageCursor).id).byteLength >
      MAX_MESSAGE_ID_BYTES
  ) {
    throw new Error(INVALID_CURSOR);
  }
}
