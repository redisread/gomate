import type { z } from "zod";
import { teamCreateInputSchema } from "@/contracts/team-input";

const operationSchema = teamCreateInputSchema;
export type TeamCreateOperation = z.infer<typeof operationSchema>;
const key = (userId: string) => `gomate.team-create.${encodeURIComponent(userId)}`;

export function readTeamCreateOperation(storage: Storage, userId: string): TeamCreateOperation | null {
  const saved = readTeamCreateRaw(storage, userId);
  if (saved === null) return null;
  if (saved.length > 32_768) throw new Error("Invalid saved operation");
  return operationSchema.parse(JSON.parse(saved));
}

export function saveTeamCreateOperation(storage: Storage, userId: string, operation: TeamCreateOperation) {
  const existing = readTeamCreateOperation(storage, userId);
  if (existing && existing.requestId !== operation.requestId) throw new Error("Another operation is pending");
  const serialized = JSON.stringify(operation);
  storage.setItem(key(userId), serialized);
  if (storage.getItem(key(userId)) !== serialized) throw new Error("Operation was not saved");
}

export function clearTeamCreateOperation(storage: Storage, userId: string, requestId: string) {
  const saved = readTeamCreateOperation(storage, userId);
  if (saved?.requestId === requestId) storage.removeItem(key(userId));
}

export function newTeamCreateOperation(input: unknown): TeamCreateOperation {
  return operationSchema.parse(input);
}

export function readTeamCreateRaw(storage: Storage, userId: string): string | null {
  return storage.getItem(key(userId));
}

/** Manual reconciliation compares the exact record, including malformed data. */
export function discardTeamCreateRecord(storage: Storage, userId: string, expected: string | null) {
  if (readTeamCreateRaw(storage, userId) !== expected) throw new Error("Pending operation changed");
  storage.removeItem(key(userId));
}

/** Successful explicit logout clears only this user's private creation record. */
export function clearSignedOutTeamCreate(storage: Storage, userId: string) {
  storage.removeItem(key(userId));
}
