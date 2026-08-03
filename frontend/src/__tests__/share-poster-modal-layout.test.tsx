import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SharePosterModal } from "../components/features/share-poster-modal";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("@/i18n", () => ({
  getLocale: () => "zh-CN",
}));

vi.mock("@/lib/api", () => ({
  API_BASE: "https://api.example.com",
}));

describe("SharePosterModal layout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the location poster centered at the available width and preserves action-bar spacing", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>(() => undefined),
    );

    render(
      <SharePosterModal
        type="location"
        id="location-1"
        title="梧桐山"
        url="https://gomate.live/locations/location-1"
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.parentElement).toHaveClass("items-center");
    expect(screen.getByRole("button", { name: "common.wechat.close" })).toHaveClass(
      "size-11",
    );

    const preview = screen.getByTestId("share-poster-preview");
    expect(preview).toHaveClass("mx-auto", "w-full");
    expect(preview.parentElement).not.toHaveClass("flex");
    expect(preview.style.maxHeight).toBe("");
    expect(preview.style.aspectRatio).toBe("375 / 584");

    const actions = screen.getByTestId("share-poster-actions");
    expect(actions).toHaveClass(
      "pb-[max(1rem,env(safe-area-inset-bottom))]",
    );
    for (const button of screen.getAllByRole("button").slice(-2)) {
      expect(button).toHaveClass("min-h-11");
    }
  });

  it("keeps the shorter team poster ratio without viewport-height constraints", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>(() => undefined),
    );

    render(
      <SharePosterModal
        type="team"
        id="team-1"
        title="周末徒步"
        url="https://gomate.live/teams/team-1"
        onClose={vi.fn()}
      />,
    );

    const preview = screen.getByTestId("share-poster-preview");
    expect(preview.style.aspectRatio).toBe("375 / 468");
    expect(preview.style.maxHeight).toBe("");
  });
});
