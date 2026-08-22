import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeGuestStickyCta } from "../components/features/home/home-guest-sticky-cta";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

describe("HomeGuestStickyCta", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  });

  it("appears only after the visitor leaves the first screen", () => {
    render(<HomeGuestStickyCta />);

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    Object.defineProperty(window, "scrollY", { configurable: true, value: 700 });
    fireEvent.scroll(window);

    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("can be dismissed for the rest of the visit", () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 700 });
    render(<HomeGuestStickyCta />);

    fireEvent.click(screen.getByRole("button", { name: "home.guestSticky.close" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    fireEvent.scroll(window);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
