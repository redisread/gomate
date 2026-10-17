import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MapPreview } from "./map-preview";
import type { MapPoint } from "./use-map-data";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);

const point = {
  id: "first",
  name: "梧桐山",
  provinceName: "广东省",
  region: { name: "深圳" },
  latitude: 22.6,
  longitude: 114.2,
  coverImageUrl: "/first.jpg",
} as MapPoint;
const props = {
  animate: false,
  candidates: [],
  loading: false,
  failed: false,
  unavailable: false,
  emptyProvince: null,
  onSelect: vi.fn(),
  onRetry: vi.fn(),
  onNavigate: vi.fn(),
};

it("shows only the selected cover and preserves navigation when it fails", () => {
  const view = render(<MapPreview {...props} point={point} />);
  const cover = view.container.querySelector("img");
  expect(cover).toHaveAttribute("src", "/first.jpg");
  expect(cover).toHaveAttribute("alt", "");
  fireEvent.error(cover!);
  expect(view.container.querySelector("img")).toBeNull();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/locations/first");

  view.rerender(
    <MapPreview
      {...props}
      point={{
        ...point,
        id: "second",
        name: "塘朗山",
        coverImageUrl: "/second.jpg",
      }}
    />,
  );
  expect(view.container.querySelector("img")).toHaveAttribute(
    "src",
    "/second.jpg",
  );
  expect(screen.getByRole("link")).toHaveAttribute("href", "/locations/second");
  // A response from an unmounted cover must not overwrite the current selection.
  fireEvent.load(cover!);
  expect(view.container.querySelector("img")).toHaveAttribute(
    "src",
    "/second.jpg",
  );
  view.rerender(<MapPreview {...props} point={null} />);
  expect(view.container.querySelector("img")).toBeNull();
});

it("keeps a missing cover usable without issuing an empty image request", () => {
  const view = render(
    <MapPreview {...props} point={{ ...point, coverImageUrl: null }} />,
  );
  expect(view.container.querySelector("img")).toBeNull();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/locations/first");
  expect(screen.getByText("梧桐山")).toBeVisible();
});
