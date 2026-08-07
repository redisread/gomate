import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamDepartureBrief } from "../components/features/team-detail/team-detail-overview";
import { TeamDecisionPrimaryAction } from "../components/features/team-detail/team-detail-sidebar";
import type { Location, Team } from "../lib/types";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const copy: Record<string, string> = {
        "common.backTeams": "Back to teams",
        "teams.activityLocation": "Activity location",
        "teams.creatorLabel": "Creator",
        "teams.estimatedPrefix": "Estimated",
        "teams.joinTeam": "Apply to join",
        "teams.loginBtn": "Log in",
        "teams.loginToJoinTeam": "Log in to apply and join the team",
        "teams.statusEnded": "Ended",
        "teams.viewLocationDetail": "View location details",
        "enums.level.advanced": "Advanced",
      };
      return copy[key] || key;
    },
  }),
}));

const team = {
  id: "team-1",
  locationId: "location-1",
  title: "惠州大南山｜周末徒步",
  description: "本周六前往惠州大南山徒步，集合信息由队长通知。",
  date: "2026-08-08",
  time: "06:30",
  duration: "8h",
  durationMin: 480,
  maxMembers: 10,
  currentMembers: 1,
  requirements: [],
  status: "recruiting",
  createdAt: "2026-08-01T00:00:00Z",
  leader: {
    id: "leader-1",
    name: "Victor",
    nickname: null,
    avatar: null,
    level: "advanced",
    completedHikes: 8,
    bio: "",
  },
} satisfies Team;

const location = {
  id: "location-1",
  name: "大南山",
  slug: "da-nan-shan",
  description: "",
  cityId: "huizhou",
  cityName: "惠州",
  bestSeason: [],
  coverImage: "https://example.com/location.jpg",
  images: [],
  coordinates: { lat: 22.8, lng: 114.4 },
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
} satisfies Location;

describe("team detail responsive information architecture", () => {
  it("renders the location image before the decision summary in one departure brief", () => {
    render(
      <TeamDepartureBrief
        team={team}
        location={location}
        statusLabel="等你一起"
        canMessageLeader={false}
      />,
    );

    const brief = screen.getByTestId("team-departure-brief");
    const image = screen.getByRole("img", { name: "大南山" });
    const heading = screen.getByRole("heading", { level: 1, name: team.title });

    expect(brief).toContainElement(image);
    expect(brief).toContainElement(heading);
    expect(image.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(image).toHaveAttribute("width", "1200");
    expect(image).toHaveAttribute("height", "900");
    expect(image).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("link", { name: /大南山/ })).toHaveAttribute(
      "href",
      "/locations/location-1",
    );
  });

  it("shows only login for an anonymous visitor even when the team has space", () => {
    render(
      <TeamDecisionPrimaryAction
        team={team}
        userId={null}
        canJoin
        isFull={false}
        isLeader={false}
        isMember={false}
        isPending={false}
        onJoin={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?redirect=/teams/team-1",
    );
    expect(screen.queryByRole("button", { name: "Apply to join" })).not.toBeInTheDocument();
  });

  it("shows the join action for an authenticated visitor when the team has space", () => {
    render(
      <TeamDecisionPrimaryAction
        team={team}
        userId="visitor-1"
        canJoin
        isFull={false}
        isLeader={false}
        isMember={false}
        isPending={false}
        onJoin={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Apply to join" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("does not invite an anonymous visitor to log in when the team has ended", () => {
    render(
      <TeamDecisionPrimaryAction
        team={{ ...team, status: "completed" }}
        userId={null}
        canJoin={false}
        isFull={false}
        isLeader={false}
        isMember={false}
        isPending={false}
        onJoin={vi.fn()}
      />,
    );

    expect(screen.getByText("Ended")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });
});
