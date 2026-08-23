import { describe, expect, it } from "vitest";

import type { ActivityTypeInfo } from "@/contracts";
import {
  activityTypeLabel,
  orderActivityTypesForLocation,
} from "./activity-types";

const types: ActivityTypeInfo[] = [
  { id: "hiking", name: "徒步", slug: "hiking", isActive: true, sortOrder: 10 },
  { id: "paddling", name: "桨板", slug: "paddling", isActive: true, sortOrder: 20 },
  { id: "travel", name: "旅行", slug: "travel", isActive: true, sortOrder: 30 },
];

describe("activity type presentation", () => {
  it("prioritizes location recommendations without filtering the catalog", () => {
    expect(orderActivityTypesForLocation(types, ["travel"]).map(({ id }) => id))
      .toEqual(["travel", "hiking", "paddling"]);
  });

  it("uses catalog names and safely falls back to the stable id", () => {
    expect(activityTypeLabel("paddling", types)).toBe("桨板");
    expect(activityTypeLabel("retired-type", types)).toBe("retired-type");
  });
});
