import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamDepartureBrief } from "../components/features/team-detail/team-detail-overview";
import { TeamDecisionPrimaryAction } from "../components/features/team-detail/team-detail-sidebar";
import { TeamDetailSkeleton } from "../components/features/team-detail/team-detail-skeleton";
import type { Location, Team } from "../lib/types";

vi.mock("../components/layout/navbar", () => ({
  Navbar: () => <div data-testid="mock-navbar" />,
}));

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
  leaderId: "leader-1",
  activityType: "hiking",
  title: "惠州大南山｜周末徒步",
  description: "本周六前往惠州大南山徒步，集合信息由队长通知。",
  startAt: "2026-08-08T06:30:00.000Z",
  endAt: "2026-08-08T14:30:00.000Z",
  maxParticipants: 10,
  activeParticipantCount: 1,
  requirements: [],
  recruitmentStatus: "open",
  formedAt: null,
  cancelledAt: null,
  lifecycle: "pending",
  isFull: false,
  checklist: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  leader: {
    id: "leader-1",
    name: "Victor",
    nickname: null,
    image: null,
    bio: "",
    extra: { level: "advanced", completedHikes: 8, wechat: null, city: "huizhou" },
  },
} satisfies Team;

const location = {
  id: "location-1",
  regionId: "huizhou",
  name: "大南山",
  slug: "da-nan-shan",
  supportedActivityTypes: ["hiking"],
  status: "published",
  subtitle: null,
  description: "",
  address: null,
  latitude: 22.8,
  longitude: 114.4,
  coverImageUrl: "https://example.com/location.jpg",
  images: [],
  extra: {},
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  region: {
    id: "huizhou",
    countryCode: "CN",
    parentId: null,
    name: "惠州",
    nameEn: "Huizhou",
    slug: "huizhou",
    code: "441300",
    level: "city",
    timezone: "Asia/Shanghai",
    centerLatitude: null,
    centerLongitude: null,
    serviceEnabled: true,
    isHot: false,
    sortOrder: 0,
  },
} satisfies Location;

describe("team detail responsive information architecture", () => {
  it("在导航栏下方为详情主体保留响应式呼吸空间", () => {
    render(<TeamDetailSkeleton />);

    const content = screen.getByTestId("team-detail-content");

    expect(content).toHaveClass("pt-24", "lg:pt-28");
  });

  it("renders the location image before the decision summary in one departure brief", () => {
    render(
      <TeamDepartureBrief
        team={team}
        location={location}
        statusLabel="等你一起"
        canMessageLeader={false}
        desktopAction={<button type="button">Apply to join</button>}
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
    expect(image.closest("a")).toBeNull();
    expect(screen.getByTestId("team-desktop-primary-action")).toContainElement(
      screen.getByRole("button", { name: "Apply to join" }),
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
        team={{ ...team, lifecycle: "completed", recruitmentStatus: "closed" }}
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
