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
    description: "ISO 时间戳，秒可省略；时区必须为 Z、±HH:mm 或 ±HHmm。",
  });

// Existing profile timestamps also accept minute precision (no seconds).
const utcPattern = new RegExp(`^${date}T${time}Z$`);
export const utcDateTimeSchema = z
  .stringFormat("gomate-datetime", utcPattern)
  .openapi({
    pattern: utcPattern.source,
    description: "以 Z 结尾的 UTC 时间戳，秒可省略。",
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
      description: "可由 WHATWG URL 解析器解析的 URL，保留输入原文。",
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
    description: "重复传入同名查询参数时只取第一个值。",
  });
