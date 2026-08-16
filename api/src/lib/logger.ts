import { AsyncLocalStorage } from "node:async_hooks";

type LogLevel = "debug" | "info" | "warn" | "error";

type RequestLogContext = Readonly<{
  requestId: string;
}>;

type SafeError = Readonly<{
  type: string;
  code?: string | number;
}>;

type SafeLogValue = string | number | boolean | SafeError;
type StructuredLogEntry = Record<string, SafeLogValue> & {
  event: string;
  level: LogLevel;
  timestamp: string;
};

const requestLogContext = new AsyncLocalStorage<RequestLogContext>();
const CF_RAY_PATTERN = /^[0-9a-f]{16,32}-[a-z0-9]{2,8}$/iu;
// Only developer-defined machine names enter the indexed event field. Legacy
// prose falls back to a fixed event instead of leaking dynamic text.
const STABLE_EVENT_PATTERN = /^[a-z][a-z0-9_]{2,63}$/u;
const SAFE_ERROR_TYPE_PATTERN = /^(?:Error|[A-Za-z][A-Za-z0-9]{0,62}(?:Error|Exception))$/u;
const SAFE_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SAFE_ROUTE_PATTERN = /^\/[a-z0-9_./:*-]{0,160}$/iu;
const SAFE_METHODS = new Set([
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
]);

// Metadata is allowlisted rather than recursively serialized: callers cannot
// accidentally emit request bodies, user records, headers, or secrets.
const SAFE_STRING_FIELDS = new Set([
  "errorCode",
  "errorType",
  "method",
  "route",
  "statusClass",
]);
const SAFE_NUMBER_FIELDS = new Set([
  "attempt",
  "count",
  "durationMs",
  "status",
]);
const SAFE_BOOLEAN_FIELDS = new Set(["cached"]);

function normalizeEventName(event: string, level: LogLevel): string {
  const candidate = event.trim();
  return STABLE_EVENT_PATTERN.test(candidate)
    ? candidate
    : `application_${level}`;
}

function normalizeError(error: unknown): SafeError {
  if (!(error instanceof Error)) return { type: "NonError" };
  const type = SAFE_ERROR_TYPE_PATTERN.test(error.name) ? error.name : "Error";
  const rawCode = (error as Error & { code?: unknown }).code;
  const code =
    typeof rawCode === "number"
      ? rawCode
      : typeof rawCode === "string" && SAFE_ERROR_CODE_PATTERN.test(rawCode)
        ? rawCode
        : undefined;
  return code === undefined ? { type } : { type, code };
}

function sanitizeStringField(key: string, value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (key === "method") {
    const method = value.toUpperCase();
    return SAFE_METHODS.has(method) ? method : undefined;
  }
  if (key === "route") {
    return SAFE_ROUTE_PATTERN.test(value) ? value : undefined;
  }
  if (key === "errorType") {
    return SAFE_ERROR_TYPE_PATTERN.test(value) ? value : undefined;
  }
  if (key === "errorCode") {
    return SAFE_ERROR_CODE_PATTERN.test(value) ? value : undefined;
  }
  if (key === "statusClass") {
    return /^[1-5]xx$/u.test(value) ? value : undefined;
  }
  return undefined;
}

function sanitizeMetadata(metadata: unknown): Record<string, SafeLogValue> {
  if (metadata instanceof Error) return { error: normalizeError(metadata) };
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const safe: Record<string, SafeLogValue> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key === "error") {
      safe.error = normalizeError(value);
      continue;
    }
    if (SAFE_STRING_FIELDS.has(key)) {
      const normalized = sanitizeStringField(key, value);
      if (normalized !== undefined) safe[key] = normalized;
      continue;
    }
    if (
      SAFE_NUMBER_FIELDS.has(key) &&
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      safe[key] = value;
      continue;
    }
    if (SAFE_BOOLEAN_FIELDS.has(key) && typeof value === "boolean") {
      safe[key] = value;
    }
  }
  return safe;
}

function emit(level: LogLevel, event: string, metadata?: unknown): void {
  const requestId = requestLogContext.getStore()?.requestId;
  const entry: StructuredLogEntry = {
    event: normalizeEventName(event, level),
    level,
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    ...sanitizeMetadata(metadata),
  };

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else if (level === "info") console.info(entry);
  else console.debug(entry);
}

export function createRequestId(cfRay: string | null | undefined): string {
  const uuid = crypto.randomUUID();
  const normalizedRay = cfRay?.trim().toLowerCase();
  return normalizedRay && CF_RAY_PATTERN.test(normalizedRay)
    ? `${normalizedRay}-${uuid}`
    : uuid;
}

export function runWithRequestLogContext<T>(
  requestId: string,
  callback: () => T,
): T {
  return requestLogContext.run({ requestId }, callback);
}

export const logger = {
  debug: (event: string, metadata?: unknown) => emit("debug", event, metadata),
  info: (event: string, metadata?: unknown) => emit("info", event, metadata),
  warn: (event: string, metadata?: unknown) => emit("warn", event, metadata),
  error: (event: string, metadata?: unknown) => emit("error", event, metadata),
};
