import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GalleryImage } from "./gallery-image";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
let requests: HTMLImageElement[];
beforeEach(() => {
  requests = [];
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      decode = () => Promise.resolve();
      constructor() {
        requests.push(this as unknown as HTMLImageElement);
      }
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function loaded(index: number) {
  await act(async () => {
    requests[index].onload?.(new Event("load"));
  });
}
it("keeps the visible image until the newest selection loads, ignoring stale responses", async () => {
  const view = render(<GalleryImage src="/a.jpg" alt="地点封面" />);
  await loaded(0);
  expect(screen.getByRole("img", { name: "地点封面" })).toHaveAttribute(
    "src",
    "/a.jpg",
  );
  view.rerender(<GalleryImage src="/b.jpg" alt="地点封面" />);
  const lateLoad = requests[1].onload;
  view.rerender(<GalleryImage src="/c.jpg" alt="地点封面" />);
  expect(screen.getByRole("img", { name: "地点封面" })).toHaveAttribute(
    "src",
    "/a.jpg",
  );
  await loaded(2);
  await act(async () => {
    lateLoad?.call(requests[1], new Event("load"));
  });
  expect(screen.getByRole("img", { name: "地点封面" })).toHaveAttribute(
    "src",
    "/c.jpg",
  );
});
it("preserves the current image after failure and retries the requested image", async () => {
  const view = render(<GalleryImage src="/a.jpg" alt="地点封面" />);
  await loaded(0);
  view.rerender(<GalleryImage src="/b.jpg" alt="地点封面" />);
  act(() => {
    requests[1].onerror?.(new Event("error"));
  });
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "地点封面" })).toHaveAttribute(
    "src",
    "/a.jpg",
  );
  fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
  await loaded(2);
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("img", { name: "地点封面" })).toHaveAttribute(
    "src",
    "/b.jpg",
  );
});

it("keeps the accessible name attached to the visible image until replacement succeeds", async () => {
  const view = render(<GalleryImage src="/a.jpg" alt="图片 1" />);
  await loaded(0);
  view.rerender(<GalleryImage src="/b.jpg" alt="图片 2" />);
  expect(screen.getByRole("img", { name: "图片 1" })).toHaveAttribute(
    "src",
    "/a.jpg",
  );
  act(() => {
    requests[1].onerror?.(new Event("error"));
  });
  expect(screen.queryByRole("img", { name: "图片 2" })).not.toBeInTheDocument();
});
