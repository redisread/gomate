import { z } from "@hono/zod-openapi";

// Preserve the API's existing ISO input grammar, including compact offsets.
// Zod 4's built-in datetime requires a colon in the offset. Keep this explicit
// pattern in the contract so runtime validation and generated docs agree.
const date = z.regexes.date.source.replace(/^\^|\$$/g, "");
const time = "([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d(\\.\\d+)?)?";
const offsetPattern = new RegExp(`^${date}T${time}(Z|[+-]\\d{2}:?\\d{2})$`);
export const offsetDateTimeSchema = z
  .stringFormat("gomate-datetime", offsetPattern)
  .openapi({
    pattern: offsetPattern.source,
    description: "ISO timestamp; seconds optional; Z or ±HH:mm / ±HHmm offset.",
  });

// Existing profile timestamps also accept minute precision (no seconds).
const utcPattern = new RegExp(`^${date}T${time}Z$`);
export const utcDateTimeSchema = z
  .stringFormat("gomate-datetime", utcPattern)
  .openapi({
    pattern: utcPattern.source,
    description: "UTC timestamp ending in Z; seconds optional.",
  });

// Unlike Zod 4's URL parser, the previous contract did not trim URL text.
export function urlTextSchema(message: string) {
  return z
    .stringFormat(
      "gomate-url",
      (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      { error: message },
    )
    .openapi({
      description:
        "URL accepted by the WHATWG URL parser; original text is preserved.",
    });
}

/** Preserve Hono req.query's first-value behavior for legacy scalar queries. */
export const firstQueryStringSchema = z
  .preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.string().optional(),
  )
  .openapi({
    type: "string",
    description: "If repeated, only the first query value is used.",
  });
