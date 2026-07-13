/**
 * Simple structured logger for Cloudflare Workers environment.
 *
 * In production, only ERROR level logs are emitted to reduce noise
 * and log volume. Other levels are no-ops.
 *
 * Usage:
 *   import { logger } from "../lib/logger";
 *   logger.error("Database connection failed", { teamId });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  try {
    const env = (globalThis as unknown as Record<string, string>).LOG_LEVEL;
    if (env && env in LEVELS) return env as LogLevel;
  } catch {
    // ignore
  }
  return "error";
}

const MIN_LEVEL = getMinLevel();

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta !== undefined ? ` | ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug: (message: string, meta?: unknown) => {
    if (shouldLog("debug")) {
      console.log(formatMessage("debug", message, meta));
    }
  },

  info: (message: string, meta?: unknown) => {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },

  warn: (message: string, meta?: unknown) => {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },

  error: (message: string, meta?: unknown) => {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },
};

/** Convenience alias for error logging in catch blocks */
export function logError(message: string, error: unknown) {
  logger.error(message, { error: String(error) });
}
