import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeClient } from "../components/features/home/home-main";

const fetchCurrentUserMock = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchCurrentUser: (...args: unknown[]) => fetchCurrentUserMock(...args),
}));

vi.mock("../components/features/home/use-home-data", () => ({
  useHomeData: () => ({
    locations: [],
    teams: [],
    preloadImages: [],
    userCity: null,
    animate: {
      badge: "",
      title: "",
      subtitle: "",
      search: "",
      cta: "",
      stats: "",
    },
  }),
}));

vi.mock("../components/features/home/local-circle/home-local-circle-section", () => ({
  HomeLocalCircleSection: () => <div data-testid="local-circle" />,
}));

vi.mock("../components/features/home/home-map-section", () => ({
  HomeMapSection: () => <div data-testid="home-map" />,
}));

vi.mock("../components/features/onboarding/onboarding-modal", () => ({
  OnboardingModal: () => null,
}));

vi.mock("../components/features/home/preload-images", () => ({
  PreloadImages: () => null,
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

describe("HomeClient auth-specific experience", () => {
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
  });

  it("shows an auth-safe loading surface before the session resolves", () => {
    fetchCurrentUserMock.mockReturnValue(new Promise(() => undefined));

    render(<HomeClient />);

    expect(screen.getByTestId("home-auth-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("guest-home")).not.toBeInTheDocument();
    expect(screen.queryByTestId("member-home")).not.toBeInTheDocument();
  });

  it("renders the guest departure experience for signed-out visitors", async () => {
    fetchCurrentUserMock.mockResolvedValue(null);

    await act(async () => {
      render(<HomeClient />);
    });

    expect(await screen.findByTestId("guest-home")).toBeInTheDocument();
    expect(screen.queryByTestId("member-home")).not.toBeInTheDocument();
  });

  it("renders the member action experience for signed-in users", async () => {
    fetchCurrentUserMock.mockResolvedValue({
      id: "user-1",
      name: "Victor",
      nickname: "Victor",
      city: "shenzhen",
    });

    await act(async () => {
      render(<HomeClient />);
    });

    expect(await screen.findByTestId("member-home")).toBeInTheDocument();
    expect(screen.queryByTestId("guest-home")).not.toBeInTheDocument();
  });
});
