import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SharePosterPreview } from "../components/features/team-detail/share-poster-preview";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/i18n", () => ({ getLocale: () => "zh-CN" }));
vi.mock("@/lib/api", () => ({ API_BASE: "https://api.example.com" }));

describe("SharePosterPreview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("offers the same preset choices in the Team bottom sheet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<svg />", { headers: { "content-type": "image/svg+xml" } }),
    );
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: vi.fn(() => "blob:poster") },
      revokeObjectURL: { configurable: true, value: vi.fn() },
    });

    render(
      <SharePosterPreview
        open
        teamId="team-1"
        teamTitle="周末徒步"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("radio", { name: /posterPresetJournal/ }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("preset=journal");
  });
});
