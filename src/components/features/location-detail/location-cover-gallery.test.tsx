import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationCoverGallery } from "./location-cover-gallery";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string, values?: { index: string }) => values ? `${key} ${values.index}` : key }),
}));
afterEach(cleanup);

describe("LocationCoverGallery", () => {
  it("keeps an empty gallery non-interactive", () => {
    render(<LocationCoverGallery images={[]} name="Mountain" onOpen={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens a single image directly without an expand control", () => {
    const open = vi.fn();
    render(<LocationCoverGallery images={["/one.jpg"]} name="Mountain" onOpen={open} />);
    fireEvent.click(screen.getByRole("button"));
    expect(open).toHaveBeenCalledWith(0);
    expect(screen.queryByText("locationDetail.expandPhotos")).not.toBeInTheDocument();
  });

  it("exposes every image on touch expansion and restores toggle focus on Escape", () => {
    const open = vi.fn();
    render(<LocationCoverGallery images={Array.from({ length: 12 }, (_, i) => `/${i}.jpg`)} name="Mountain" onOpen={open} />);
    const toggle = screen.getByRole("button", { name: /locationDetail.expandPhotos/ });
    expect(screen.getAllByRole("button")).toHaveLength(2);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("button")).toHaveLength(13);
    const last = screen.getByRole("button", { name: /locationDetail.imageAlt 12$/ });
    fireEvent.click(last);
    expect(open).toHaveBeenCalledWith(11);
    fireEvent.keyDown(last, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
