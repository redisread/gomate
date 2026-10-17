import { z } from "../../lib/openapi";

/** Existing handlers use the first occurrence when a query key is repeated. */
export const queryString = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().optional(),
);
export const TeamQuerySchema = z.object({
  limit: queryString.openapi({
    description: "Integer from 1 to 100; defaults to 12.",
  }),
  cursor: queryString.openapi({ description: "Opaque continuation cursor." }),
  regionId: queryString,
  locationId: queryString,
  activityType: queryString.openapi({
    description: "Activity identifier; surrounding whitespace is ignored.",
  }),
  recruitmentStatus: queryString.openapi({
    description: "open or closed; surrounding whitespace is ignored.",
  }),
  lifecycle: queryString.openapi({
    description:
      "cancelled, pending, formed, in_progress, completed or expired_unformed.",
  }),
  search: queryString.openapi({
    description: "Trimmed and truncated to 100 characters.",
  }),
  tagIds: queryString.openapi({
    description:
      "Comma-separated tag IDs; OR matching, first 50 distinct nonempty IDs.",
  }),
  startDateFrom: queryString.openapi({
    description:
      "Date or date-time accepted by JavaScript Date; date-only starts at UTC midnight.",
  }),
  startDateTo: queryString.openapi({
    description: "Date or date-time; date-only includes the full UTC day.",
  }),
});
