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
    userId: "member-1",
    role: "member",
    joinedAt: "2026-01-01",
    leftAt: null,
    user: {
      id: "member-1",
      name: "Ada",
      nickname: null,
      image: null,
      bio: null,
      gender: null,
      birthday: null,
      extra: { level: "beginner", completedHikes: 0, wechat: null, city: null },
    },
  },
  {
    userId: "left-1",
    role: "member",
    joinedAt: "2026-01-01",
    leftAt: "2026-02-01",
    user: {
      id: "left-1",
      name: "Left",
      nickname: null,
      image: null,
      bio: null,
      gender: null,
      birthday: null,
      extra: { level: "beginner", completedHikes: 0, wechat: null, city: null },
    },
  },
];

describe("MemberAvatarGrid", () => {
  it("shows message action only for active participants when viewed by the leader", () => {
    render(
      <MemberAvatarGrid
        members={members}
        teamId="team-1"
        canMessageMembers
      />
    );

    expect(screen.getByRole("button", { name: "Message Ada" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Message Left" })).not.toBeInTheDocument();
  });

  it("hides member message actions for non-leader viewers", () => {
    render(
      <MemberAvatarGrid
        members={members}
        teamId="team-1"
        canMessageMembers={false}
      />
    );

    expect(screen.queryByRole("button", { name: "Message Ada" })).not.toBeInTheDocument();
  });
});
