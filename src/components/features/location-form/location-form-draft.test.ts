import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LOCATION_FORM } from "./location-form-data";
import {
  loadLocationDraft,
  removeLocationDraft,
  saveLocationDraft,
} from "./location-form-draft";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

const data = { ...DEFAULT_LOCATION_FORM, name: "Draft" };

describe("location recovery drafts", () => {
  it("keeps create and different edit drafts separate and expires after seven days", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    saveLocationDraft(data);
    saveLocationDraft({ ...data, name: "Edited" }, "a");
    saveLocationDraft({ ...data, name: "Another" }, "b");
    expect(loadLocationDraft()?.name).toBe("Draft");
    expect(loadLocationDraft("a")?.name).toBe("Edited");
    removeLocationDraft("a");
    expect(loadLocationDraft("a")).toBeNull();
    expect(loadLocationDraft("b")?.name).toBe("Another");
    vi.mocked(Date.now).mockReturnValue(1_000 + 7 * 24 * 60 * 60 * 1_000);
    expect(loadLocationDraft()).toBeNull();
    expect(localStorage.getItem("location-create-draft")).toBeNull();
  });

  it("normalizes v2 hiking fields without extending its expiry", () => {
    const expiresAt = Date.now() + 10_000;
    localStorage.setItem(
      "location-create-draft",
      JSON.stringify({
        version: 2,
        expiresAt,
        data: {
          ...data,
          extra: {
            facilities: ["water"],
            hiking: { bestSeasons: ["spring"], gearEssential: ["retired"] },
          },
        },
      }),
    );
    expect(loadLocationDraft()?.extra).toEqual({
      facilities: ["water"],
      hiking: { bestSeasons: ["spring"] },
    });
    expect(
      JSON.parse(localStorage.getItem("location-create-draft")!),
    ).toMatchObject({ version: 3, expiresAt });
  });

  it("can recover readable drafts even if the normalization write hits quota", () => {
    saveLocationDraft(data);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    expect(loadLocationDraft()?.name).toBe("Draft");
    expect(() => saveLocationDraft(data)).not.toThrow();
  });

  it.each([
    "{broken",
    JSON.stringify({ version: 1, data }),
    JSON.stringify({ version: 3, expiresAt: Date.now() + 10000, data: {} }),
  ])("discards unreadable or unsupported recovery data: %s", (raw) => {
    localStorage.setItem("location-create-draft", raw);
    expect(loadLocationDraft()).toBeNull();
    expect(localStorage.getItem("location-create-draft")).toBeNull();
  });
});
