import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamMainContent } from "../components/features/team-detail/team-detail-content";
import type { Team } from "../lib/types";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const team = {
  id: "team-1",
  locationId: "location-1",
  leaderId: "leader-1",
  activityType: "hiking",
  title: "周末徒步",
  description: null,
  startAt: "2026-08-30T02:00:00.000Z",
  endAt: "2026-08-30T10:00:00.000Z",
  maxParticipants: 8,
  activeParticipantCount: 1,
  requirements: [],
  recruitmentStatus: "closed",
  formedAt: "2026-08-29T02:00:00.000Z",
  cancelledAt: null,
  lifecycle: "completed",
  isFull: false,
  meetingPoint: "Meet at the station",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
} satisfies Team;

describe("TeamMainContent", () => {
  it("shows the team meeting information", () => {
    render(
      <TeamMainContent
        ctx={
          {
            team,
            allMembers: [],
            isLeader: true,
            isMember: false,
            userId: "leader-1",
            show: vi.fn(),
            loadTeam: vi.fn(),
          } as never
        }
      />,
    );

    expect(screen.getByText("Meet at the station")).toBeInTheDocument();
  });
});
