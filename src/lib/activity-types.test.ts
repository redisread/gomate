import { describe, expect, it } from "vitest";

import { ACTIVITY_TYPES } from "@/contracts";
import {
  isActivityType,
  orderActivityTypesForLocation,
} from "./activity-types";

describe("activity type enum", () => {
  it("keeps the complete activity catalog in code", () => {
    expect(ACTIVITY_TYPES).toEqual(["hiking", "explore", "leisure", "travel"]);
  });

  it("prioritizes location recommendations without filtering the catalog", () => {
    expect(orderActivityTypesForLocation(ACTIVITY_TYPES, ["travel"]))
      .toEqual(["travel", "hiking", "explore", "leisure"]);
  });

  it("rejects values outside the code enum", () => {
    expect(isActivityType("hiking")).toBe(true);
    expect(isActivityType("paddling")).toBe(false);
  });
});
