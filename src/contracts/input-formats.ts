import { z } from "zod";

// Preserve the API's existing ISO input grammar, including compact offsets.
// Zod 4's built-in datetime requires a colon in the offset. Keep this explicit
// pattern in the contract so runtime validation and generated docs agree.
const date = z.regexes.date.source.replace(/^\^|\$$/g, "");
const time = "([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d(\\.\\d+)?)?";
export const offsetDateTimeSchema = z.stringFormat(
  "datetime",
  new RegExp(`^${date}T${time}(Z|[+-]\\d{2}:?\\d{2})$`),
);
