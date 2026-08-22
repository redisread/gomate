import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Team } from "@/lib/types";
import { selectNextMemberTeam } from "../components/features/home/member-home-utils";
import { HomeMemberExperience } from "../components/features/home/home-member-experience";

const { useMemberHomeMock } = vi.hoisted(() => ({
  useMemberHomeMock: vi.fn(),
}));

vi.mock("../components/features/home/use-member-home", () => ({
  useMemberHome: (...args: unknown[]) => useMemberHomeMock(...args),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("@/components/ui/lazy-image", () => ({
  LocationCoverImage: () => <div data-testid="cover-image" />,
}));

function team(overrides: Partial<Team>): Team {
  return {
    id: "team-1",
    locationId: "location-1",
    leaderId: "user-1",
    activityType: "hiking",
    title: "梧桐山日出徒步",
    description: "",
    startAt: "2026-08-09T00:30:00.000Z",
    endAt: "2026-08-09T05:30:00.000Z",
    maxParticipants: 6,
    activeParticipantCount: 4,
    requirements: [],
    recruitmentStatus: "open",
    formedAt: null,
    cancelledAt: null,
    lifecycle: "pending",
    isFull: false,
    checklist: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    leader: {
      id: "user-1",
      name: "Victor",
      nickname: null,
      image: null,
      bio: "",
      extra: { level: "beginner", completedHikes: 0, wechat: null, city: "shenzhen" },
    },
    location: {
      id: "location-1",
      regionId: "shenzhen",
      name: "梧桐山",
      slug: "wutongshan",
      supportedActivityTypes: ["hiking"],
      status: "published",
      subtitle: null,
      description: "",
      address: "梧桐山北门",
      latitude: 22.58,
      longitude: 114.21,
      coverImageUrl: "https://example.com/wutong.jpg",
      images: [],
      extra: { hiking: { difficulty: "moderate" } },
      createdByUserId: null,
      tags: [],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
    ...overrides,
  } as Team;
}

describe("selectNextMemberTeam", () => {
  it("selects the earliest future active team and ignores archived teams", () => {
    const result = selectNextMemberTeam(
      [
        team({ id: "later", startAt: "2026-08-12T00:00:00.000Z", endAt: "2026-08-12T05:00:00.000Z" }),
        team({
          id: "completed",
          startAt: "2026-08-08T00:00:00.000Z",
          endAt: "2026-08-08T05:00:00.000Z",
          lifecycle: "completed",
        }),
      ],
      [team({ id: "next", startAt: "2026-08-09T00:30:00.000Z", endAt: "2026-08-09T05:30:00.000Z" })],
      new Date("2026-08-07T00:00:00.000Z"),
    );

    expect(result?.id).toBe("next");
  });

  it("prefers a formed team that is already underway", () => {
    const result = selectNextMemberTeam(
      [
        team({
          id: "underway",
          lifecycle: "in_progress",
          recruitmentStatus: "closed",
          formedAt: "2026-08-08T00:00:00.000Z",
          startAt: "2026-08-09T00:30:00.000Z",
          endAt: "2026-08-09T05:30:00.000Z",
        }),
        team({ id: "later", startAt: "2026-08-10T00:30:00.000Z", endAt: "2026-08-10T05:30:00.000Z" }),
      ],
      [],
      new Date("2026-08-09T01:00:00.000Z"),
    );

    expect(result?.id).toBe("underway");
  });
});

describe("HomeMemberExperience", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the signed-in user's next departure", () => {
    useMemberHomeMock.mockReturnValue({
      teams: [team({})],
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    render(
      <HomeMemberExperience
        currentUser={
          { id: "user-1", name: "Victor", nickname: "Victor" } as never
        }
        publicTeams={[]}
      />,
    );

    expect(screen.getByTestId("member-next-trip")).toBeInTheDocument();
    expect(
      screen.getByText("home.memberDashboard.upcomingStatus"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "home.memberDashboard.viewTrip" }),
    ).toHaveAttribute("href", "/teams/team-1");
  });

  it("shows a useful exploration state when the member has no active trip", () => {
    useMemberHomeMock.mockReturnValue({
      teams: [],
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    render(
      <HomeMemberExperience
        currentUser={
          { id: "user-1", name: "Victor", nickname: "Victor" } as never
        }
        publicTeams={[]}
      />,
    );

    const emptyState = screen.getByTestId("member-no-trip");
    expect(emptyState).toBeInTheDocument();
    expect(
      within(emptyState).getByRole("link", {
        name: "home.memberDashboard.findTeams",
      }),
    ).toHaveAttribute("href", "/teams");
  });
});
