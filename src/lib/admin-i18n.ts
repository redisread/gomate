import {
  isAdminErrorReason,
  type AdminErrorReason,
} from "@/contracts/admin-i18n";

export function readAdminErrorReason(payload: unknown): AdminErrorReason | null {
  if (!payload || typeof payload !== "object") return null;

  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;

  const details = (error as { details?: unknown }).details;
  if (!details || typeof details !== "object") return null;

  const reason = (details as { reason?: unknown }).reason;
  return isAdminErrorReason(reason) ? reason : null;
}
