import { flattenErrors, sValidator } from "@hono/standard-validator";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Context, Env, ValidationTargets } from "hono";

import { APIErrors, type APIError } from "./api-errors";

export type ValidationDetails = "issues" | "flatten" | "none";
export type ValidationErrorFactory = (
  message: string,
  details?: unknown,
) => APIError;

function validationDetails(
  issues: readonly StandardSchemaV1.Issue[],
  details: ValidationDetails,
) {
  return details === "flatten"
    ? flattenErrors(issues)
    : details === "issues"
      ? issues
      : undefined;
}

export function apiValidator<
  Target extends keyof ValidationTargets,
  Schema extends StandardSchemaV1,
>(
  target: Target,
  schema: Schema,
  message: string,
  details: ValidationDetails = "issues",
  errorFactory: ValidationErrorFactory = APIErrors.validationError,
) {
  return sValidator(target, schema, (result, c) => {
    if (result.success) return;

    return c.json(
      errorFactory(message, validationDetails(result.error, details)),
      400,
    );
  });
}

export async function validateValue<
  Schema extends StandardSchemaV1,
  E extends Env,
  P extends string,
>(
  c: Context<E, P>,
  value: unknown,
  schema: Schema,
  message: string,
  details: ValidationDetails = "issues",
  malformedMessage = message,
  errorFactory: ValidationErrorFactory = APIErrors.validationError,
): Promise<StandardSchemaV1.InferOutput<Schema> | Response> {
  try {
    const result = await schema["~standard"].validate(value);
    if (result.issues) {
      return c.json(
        errorFactory(message, validationDetails(result.issues, details)),
        400,
      );
    }
    return result.value;
  } catch {
    return c.json(errorFactory(malformedMessage), 400);
  }
}

export async function validateRequest<
  Target extends keyof ValidationTargets,
  Schema extends StandardSchemaV1,
  E extends Env,
  P extends string,
>(
  c: Context<E, P>,
  target: Target,
  schema: Schema,
  message: string,
  details: ValidationDetails = "issues",
  malformedMessage = message,
  errorFactory: ValidationErrorFactory = APIErrors.validationError,
): Promise<StandardSchemaV1.InferOutput<Schema> | Response> {
  try {
    const contentType = c.req.header("content-type")?.toLowerCase() ?? "";
    if (target === "json" && !contentType.includes("json")) {
      const raw = await c.req.json();
      return validateValue(
        c,
        raw,
        schema,
        message,
        details,
        malformedMessage,
        errorFactory,
      );
    }

    const response = await apiValidator(
      target,
      schema,
      message,
      details,
      errorFactory,
    )(c as never, async () => undefined);
    if (response) return response;
    return c.req.valid(target as never) as StandardSchemaV1.InferOutput<Schema>;
  } catch {
    return c.json(errorFactory(malformedMessage), 400);
  }
}
