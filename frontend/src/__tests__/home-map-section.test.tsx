import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeMapSection } from "../components/features/home/home-map-section";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("../components/features/home/china-map", () => ({
  ChinaMap: () => <div data-testid="china-map" />,
}));

describe("HomeMapSection", () => {
  it("renders the interactive map for the homepage", () => {
    render(<HomeMapSection />);

    expect(screen.getByTestId("home-map-section")).toBeTruthy();
    expect(screen.getByTestId("china-map")).toBeTruthy();
    expect(screen.getByText("home.discoveryMap.title")).toBeTruthy();
  });
});
