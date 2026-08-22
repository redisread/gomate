import { z } from "zod";
import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

const levelSchema = z.enum(["beginner", "intermediate", "advanced", "expert"]);

const storedUserExtraSchema = z
  .object({
    level: levelSchema.default("beginner"),
    completed_hikes: z.number().int().nonnegative().default(0),
    wechat: z.string().trim().min(1).max(100).nullable().default(null),
    city: z.string().trim().min(1).nullable().default(null),
  })
  .strict();

export interface UserExtra {
  level: z.infer<typeof levelSchema>;
  completedHikes: number;
  wechat: string | null;
  city: string | null;
}

const userExtraSchema = z.object({
  level: levelSchema,
  completedHikes: z.number().int().nonnegative(),
  wechat: z.string().trim().min(1).max(100).nullable(),
  city: z.string().trim().min(1).nullable(),
});

export type UserExtraPatch = Partial<UserExtra>;

const userExtraPatchSchema = userExtraSchema.partial().strict();

export function parseUserExtra(value: unknown): UserExtra {
  const stored = storedUserExtraSchema.parse(typeof value === "string" ? JSON.parse(value) : value);
  return {
    level: stored.level,
    completedHikes: stored.completed_hikes,
    wechat: stored.wechat,
    city: stored.city,
  };
}

export function mergeUserExtra(current: UserExtra, patch: UserExtraPatch): UserExtra {
  return userExtraSchema.parse({ ...current, ...patch });
}

/**
 * Builds one SQLite JSON update expression from the current column value.
 * The database evaluates it at UPDATE time, so unrelated concurrent changes
 * are preserved instead of being overwritten by an earlier application read.
 */
export function userExtraPatchExpression(
  column: SQLWrapper,
  patch: UserExtraPatch,
): SQL {
  const parsed = userExtraPatchSchema.parse(patch);
  let expression: SQL = sql`coalesce(${column}, '{}')`;
  const fields: Array<[string, unknown]> = [];
  if (parsed.level !== undefined) fields.push(["$.level", parsed.level]);
  if (parsed.completedHikes !== undefined) {
    fields.push(["$.completed_hikes", parsed.completedHikes]);
  }
  if (parsed.wechat !== undefined) fields.push(["$.wechat", parsed.wechat]);
  if (parsed.city !== undefined) fields.push(["$.city", parsed.city]);

  for (const [path, value] of fields) {
    expression = sql`json_set(${expression}, ${path}, ${value})`;
  }
  return expression;
}

export function serializeUserExtra(value: UserExtra): string {
  return JSON.stringify(toStoredUserExtra(value));
}

export function toStoredUserExtra(value: UserExtra): z.infer<typeof storedUserExtraSchema> {
  const parsed = userExtraSchema.parse(value);
  return {
    level: parsed.level,
    completed_hikes: parsed.completedHikes,
    wechat: parsed.wechat,
    city: parsed.city,
  };
}
