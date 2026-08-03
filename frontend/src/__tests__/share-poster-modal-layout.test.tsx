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
  });

  function mockGeneratedPoster() {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["poster"], { type: "image/png" }), {
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

  it("opens the poster on iOS and only reports success when the new tab opens", async () => {
    mockGeneratedPoster();
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    const openedDocument = document.implementation.createHTMLDocument();
    const open = vi.spyOn(window, "open").mockReturnValue({
      document: openedDocument,
      opener: window,
    } as Window);

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
      expect(open).toHaveBeenCalledWith("about:blank", "_blank");
      expect(openedDocument.body.textContent).toContain("share.posterOpened");
      expect(openedDocument.querySelector("img")?.getAttribute("src")).toBe(
        "blob:poster",
      );
      expect(screen.getByRole("status")).toHaveTextContent("share.posterOpened");
    });
  });

  it("shows an error instead of a false success when iOS blocks the new tab", async () => {
    mockGeneratedPoster();
    vi.stubGlobal("navigator", {
      ...navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    vi.spyOn(window, "open").mockReturnValue(null);

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
      expect(screen.getByRole("alert")).toHaveTextContent("share.downloadFailed");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });
});
