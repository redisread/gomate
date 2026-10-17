import type { StandardSchemaV1 } from "@standard-schema/spec";
import { z } from "zod";

const englishError = z.locales.en().localeError;

/** Preserve the established HTTP details contract without exposing Zod input. */
export function normalizeValidationIssues(
  issues: readonly StandardSchemaV1.Issue[],
  value: unknown,
): StandardSchemaV1.Issue[] {
  return issues.map((entry) => {
    const issue = entry as z.core.$ZodIssue;
    const path = issue.path ?? [];
    let input = value;
    for (const key of path) {
      input =
        input !== null && typeof input === "object"
          ? Reflect.get(input, key)
          : undefined;
    }
    const common = { path, message: issue.message };
    // Preserve explicitly authored messages; only translate library defaults.
    const message = (fallback: string) =>
      issue.message ===
      englishError({ ...issue, input } as Parameters<typeof englishError>[0])
        ? fallback
        : issue.message;
    const received =
      input === null
        ? "null"
        : Array.isArray(input)
          ? "array"
          : typeof input === "number" && Number.isNaN(input)
            ? "nan"
            : typeof input;
    switch (issue.code) {
      case "invalid_type": {
        const expected = issue.expected === "int" ? "integer" : issue.expected;
        const actual =
          issue.expected === "int" && typeof input === "number"
            ? "float"
            : received;
        return {
          ...common,
          code: "invalid_type",
          expected,
          received: actual,
          message: message(
            input === undefined
              ? "Required"
              : `Expected ${expected}, received ${actual}`,
          ),
        };
      }
      case "too_small":
      case "too_big": {
        const small = issue.code === "too_small";
        const bound = small ? issue.minimum : issue.maximum;
        const type = issue.origin;
        const fallback =
          type === "string"
            ? `String must contain ${small ? "at least" : "at most"} ${bound} character(s)`
            : type === "array"
              ? `Array must contain ${small ? "at least" : "at most"} ${bound} element(s)`
              : `Number must be ${small ? "greater" : "less"} than${issue.inclusive ? " or equal to" : ""} ${bound}`;
        return {
          ...common,
          code: issue.code,
          [small ? "minimum" : "maximum"]: bound,
          type,
          inclusive: issue.inclusive,
          exact: false,
          message: message(fallback),
        };
      }
      case "invalid_format":
        return {
          ...common,
          code: "invalid_string",
          validation: issue.format,
          message: message(
            issue.format === "regex" ? "Invalid" : `Invalid ${issue.format}`,
          ),
        };
      case "invalid_value": {
        const options = issue.values;
        if (options.length === 1) {
          const expected = options[0];
          return {
            ...common,
            code: "invalid_literal",
            expected,
            received: input,
            message: message(
              `Invalid literal value, expected ${JSON.stringify(expected)}`,
            ),
          };
        }
        const expected = options
          .map((v) => (typeof v === "string" ? `'${v}'` : String(v)))
          .join(" | ");
        if (!options.some((option) => typeof option === received)) {
          return {
            ...common,
            code: "invalid_type",
            expected,
            received,
            message: message(
              input === undefined
                ? "Required"
                : `Expected ${expected}, received ${received}`,
            ),
          };
        }
        return {
          ...common,
          code: "invalid_enum_value",
          options,
          received: input,
          message: message(
            `Invalid enum value. Expected ${expected}, received '${String(input)}'`,
          ),
        };
      }
      case "unrecognized_keys":
        return {
          ...common,
          code: issue.code,
          keys: issue.keys,
          message: message(
            `Unrecognized key(s) in object: ${issue.keys.map((k) => `'${k}'`).join(", ")}`,
          ),
        };
      case "invalid_union":
        return {
          ...common,
          code: issue.code,
          unionErrors: issue.errors.map((errors) => ({
            issues: normalizeValidationIssues(
              errors.map((e) => ({ ...e, path: [...path, ...e.path] })),
              value,
            ),
            name: "ZodError",
          })),
        };
      default: {
        // Never send reportInput or new generator-only metadata to clients.
        const { input: _input, ...safe } = issue as z.core.$ZodIssue & {
          input?: unknown;
        };
        void _input;
        return safe;
      }
    }
  });
}
