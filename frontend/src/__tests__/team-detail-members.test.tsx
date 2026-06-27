import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberAvatarGrid } from "../components/features/team-detail/team-detail-members";
import type { TeamMember } from "../lib/types";

vi.mock("@/hooks/useMessages", () => ({
  createConversation: vi.fn(),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const copy: Record<string, string> = {
        "teams.messageMember": "Message",
        "teams.messageMemberAria": `Message ${vars?.name ?? ""}`,
        "teams.viewAll": "View all",
        "teams.collapseText": "Collapse",
        "teams.messageStartFailed": "Unable to open messages",
      };
      return copy[key] || key;
    },
  }),
}));

const members: TeamMember[] = [
  {
    id: "leader-row",
    userId: "leader-1",
    name: "Leader",
    nickname: null,
    avatar: null,
    bio: null,
    level: "advanced",
    status: "approved",
    joinedAt: "2026-01-01",
  },
  {
    id: "member-row",
    userId: "member-1",
    name: "Ada",
    nickname: null,
    avatar: null,
    bio: null,
    level: "beginner",
    status: "approved",
    joinedAt: "2026-01-01",
  },
  {
    id: "pending-row",
    userId: "pending-1",
    name: "Pending",
    nickname: null,
    avatar: null,
    bio: null,
    level: "beginner",
    status: "pending",
    joinedAt: null,
  },
];

describe("MemberAvatarGrid", () => {
  it("shows message action only for approved non-leader members when viewed by leader", () => {
    render(
      <MemberAvatarGrid
        members={members}
        leaderId="leader-1"
        teamId="team-1"
        canMessageMembers
      />
    );

    expect(screen.getByRole("button", { name: "Message Ada" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Message Leader" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Message Pending" })).not.toBeInTheDocument();
  });

  it("hides member message actions for non-leader viewers", () => {
    render(
      <MemberAvatarGrid
        members={members}
        leaderId="leader-1"
        teamId="team-1"
        canMessageMembers={false}
      />
    );

    expect(screen.queryByRole("button", { name: "Message Ada" })).not.toBeInTheDocument();
  });
});
