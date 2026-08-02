import { describe, expect, it } from "vitest";
import { generateQrDataUrl } from "../../services/share-image/poster-cache";
import { lookupPosterStrings } from "../../services/share-image/poster-i18n";

describe("share image primitives", () => {
  it("generates a worker-compatible SVG QR data URL without a canvas", async () => {
    const dataUrl = await generateQrDataUrl("https://gomate.live/teams/example");

    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);

    const encodedSvg = dataUrl.split(",", 2)[1];
    const svg = atob(encodedSvg);
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
  });

  it("provides localized copy for team posters", () => {
    const strings = lookupPosterStrings("en");

    expect(strings.teamStatusNeed(2)).toBe("2 more people to go");
    expect(strings.teamDepartureLabel).toBe("Departure");
    expect(strings.teamScanJoin).toBe("Scan to join");
  });
});
