import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationCoverGallery } from "./location-cover-gallery";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: { index: string }) =>
      values ? `${key} ${values.index}` : key,
  }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mockImages() {
  const requests: Array<{
    src: string;
    onload: (() => Promise<void>) | null;
    onerror: (() => void) | null;
  }> = [];
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      onload: (() => Promise<void>) | null = null;
      onerror: (() => void) | null = null;
      decode = async () => {};
      constructor() {
        requests.push(this);
      }
    },
  );
  return requests;
}

describe("LocationCoverGallery", () => {
  it("keeps an empty gallery non-interactive", () => {
    render(
      <LocationCoverGallery images={[]} name="Mountain" onOpen={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("opens a single image directly without switching controls", () => {
    const open = vi.fn();
    render(
      <LocationCoverGallery
        images={["/one.jpg"]}
        name="Mountain"
        onOpen={open}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(open).toHaveBeenCalledWith(0);
    expect(
      screen.queryByRole("button", { name: "locationDetail.nextImage" }),
    ).not.toBeInTheDocument();
  });
  it("cycles backward and keeps current card until decoding succeeds", async () => {
    const requests = mockImages();
    const open = vi.fn();
    render(
      <LocationCoverGallery
        images={["/a.jpg", "/b.jpg", "/c.jpg"]}
        name="Mountain"
        onOpen={open}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "locationDetail.prevImage" }),
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(requests.at(-1)?.src).toBe("/c.jpg");
    await act(async () => {
      await requests.at(-1)?.onload?.();
    });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /imageAlt 3$/ }));
    expect(open).toHaveBeenCalledWith(2);
  });
  it("ignores stale loads and retries a failed latest request", async () => {
    const requests = mockImages();
    render(
      <LocationCoverGallery
        images={["/a.jpg", "/b.jpg", "/c.jpg"]}
        name="Mountain"
        onOpen={vi.fn()}
      />,
    );
    const next = screen.getByRole("button", {
      name: "locationDetail.nextImage",
    });
    fireEvent.click(next);
    const stale = requests.at(-1)!.onload;
    fireEvent.click(next);
    await act(async () => {
      await stale?.();
    });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    act(() => requests.at(-1)?.onerror?.());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "locationDetail.imageLoadFailed",
    );
    fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
    expect(requests.at(-1)?.src).toBe("/c.jpg");
    await act(async () => {
      await requests.at(-1)?.onload?.();
    });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
