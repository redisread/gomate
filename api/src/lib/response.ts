/**
 * Unified API response helpers.
 *
 * Success: `{ success: true, ...data }`
 * Error:   `{ success: false, error: string }`
 *
 * Use these helpers in route handlers instead of hand-rolling `c.json(...)`
 * to keep the response shape consistent for the frontend.
 */

import type { Context } from "hono";

export function apiSuccess(c: Context, data: Record<string, unknown> = {}, status = 200) {
  return c.json({ success: true, ...data }, status as never);
}

export function apiError(c: Context, error: string, status = 400) {
  return c.json({ success: false, error }, status as never);
}
