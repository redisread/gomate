import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    localStorage.clear();
  });

  function mockGeneratedPoster() {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response("poster", {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
    );
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: vi.fn(() => "blob:poster"),
      },
      revokeObjectURL: {
        configurable: true,
        value: vi.fn(),
      },
    });
  }

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

  it("falls back to execCommand and shows a success message when Clipboard API is unavailable", async () => {
    mockGeneratedPoster();
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    render(
      <SharePosterModal
        type="location"
        id="location-1"
        title="梧桐山"
        url="https://gomate.live/locations/location-1"
        onClose={vi.fn()}
      />,
    );

    const copyButton = await screen.findByRole("button", {
      name: "share.copyLink",
    });
    await waitFor(() => expect(copyButton).not.toBeDisabled());
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(screen.getByRole("status")).toHaveTextContent("share.linkCopied");
    });
  });

  it("uses the download link on iOS", async () => {
    mockGeneratedPoster();
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(
      <SharePosterModal
        type="location"
        id="location-1"
        title="梧桐山"
        url="https://gomate.live/locations/location-1"
        onClose={vi.fn()}
      />,
    );

    const downloadButton = await screen.findByRole("button", {
      name: "share.download",
    });
    await waitFor(() => expect(downloadButton).not.toBeDisabled());
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(click).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("status")).toHaveTextContent("share.posterDownloaded");
    });
  });

  it("uses iOS native file sharing when the browser supports it", async () => {
    mockGeneratedPoster();
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn(() => true);
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperties(navigator, {
      share: { configurable: true, value: share },
      canShare: { configurable: true, value: canShare },
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(
      <SharePosterModal
        type="location"
        id="location-1"
        title="梧桐山"
        url="https://gomate.live/locations/location-1"
        onClose={vi.fn()}
      />,
    );

    const downloadButton = await screen.findByRole("button", {
      name: "share.download",
    });
    await waitFor(() => expect(downloadButton).not.toBeDisabled());
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
      expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
      expect(click).not.toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent("share.posterDownloaded");
    });
  });

  it("regenerates the preview for the selected preset", async () => {
    mockGeneratedPoster();

    render(
      <SharePosterModal
        type="location"
        id="location-1"
        title="梧桐山"
        url="https://gomate.live/locations/location-1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("radio", { name: /posterPresetRidge/ }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("preset=ridge");
  });

  it("uses the stored preset for the first generated preview", async () => {
    localStorage.setItem("gomate.poster-preset", "ridge");
    mockGeneratedPoster();

    render(
      <SharePosterModal
        type="location"
        id="location-1"
        title="梧桐山"
        url="https://gomate.live/locations/location-1"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("preset=ridge");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
