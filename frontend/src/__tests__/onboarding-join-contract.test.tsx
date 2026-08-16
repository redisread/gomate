import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchAPI: vi.fn(),
  markOnboardingSeen: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ fetchAPI: mocks.fetchAPI }));
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ show: vi.fn() }),
}));
vi.mock("@/components/ui/modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/features/onboarding/use-onboarding", () => ({
  useOnboardingGate: () => ({
    status: "open",
    user: {
      id: "member-user",
      name: "Member",
      nickname: null,
      email: "member@example.test",
      emailVerified: true,
      image: null,
      bio: null,
      gender: null,
      birthday: null,
      role: "user",
      status: "active",
      extra: {
        level: "beginner",
        completedHikes: 0,
        wechat: "member-wechat",
        city: "region-city",
      },
      createdAt: "2026-08-16T00:00:00.000Z",
    },
    initial: {
      hasAnyMembership: false,
      fallbackNoType: false,
      regionId: "region-city",
      candidates: [{
        id: "team-candidate",
        title: "Candidate",
        activityType: "hiking",
        startAt: "2026-08-23T00:00:00.000Z",
        maxParticipants: 5,
        activeParticipantCount: 1,
        locationName: "Location",
        regionName: "Region",
        coverImageUrl: "https://example.test/cover.jpg",
      }],
    },
  }),
  fetchRecommend: vi.fn(),
  saveOnboardingPreference: vi.fn(),
  markOnboardingSeen: mocks.markOnboardingSeen,
  markOnboardingDismissed: vi.fn(),
}));

import { OnboardingModal } from "@/components/features/onboarding/onboarding-modal";

describe("Onboarding join contract", () => {
  beforeEach(() => {
    mocks.fetchAPI.mockReset();
    mocks.fetchAPI.mockResolvedValue(Response.json({ success: true }));
    mocks.markOnboardingSeen.mockClear();
  });

  it("omits the optional message instead of sending a rejected empty string", async () => {
    render(<OnboardingModal />);
    fireEvent.click(screen.getByRole("button", {
      name: "onboarding.preference.any",
    }));
    fireEvent.click(await screen.findByTestId("onboarding-join"));

    await waitFor(() => expect(mocks.fetchAPI).toHaveBeenCalledOnce());
    const [path, init] = mocks.fetchAPI.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/teams/team-candidate/join");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({});
    expect(mocks.markOnboardingSeen).toHaveBeenCalledOnce();
  });
});
