import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const locationDetailClientSource = readFileSync(
  join(process.cwd(), "src/components/features/location-detail-client.tsx"),
  "utf8",
);

describe("Location detail composition", () => {
  it("does not include the retired decision block or its map action", () => {
    expect(locationDetailClientSource).not.toContain("DecisionBlock");
    expect(locationDetailClientSource).not.toContain("location-detail/decision-block");
    expect(locationDetailClientSource).not.toContain("transport.openInMap");
  });
});
