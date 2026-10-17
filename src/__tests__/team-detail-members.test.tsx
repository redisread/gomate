import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberAvatarGrid } from "../components/features/team-detail/team-detail-members";
import type { TeamMember } from "../lib/types";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const copy: Record<string, string> = {
        "teams.removeMember": "Remove",
        "teams.removeMemberAria": `Remove ${vars?.name ?? ""}`,
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
  it("shows names without contact information and expands with an accessible control", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...members[0],
      userId: `member-${i}`,
      user: { ...members[0].user!, name: `Partner ${i}` },
    }));
    render(<MemberAvatarGrid members={many} />);
    expect(screen.getByRole("link", { name: "Partner 0" })).toBeVisible();
    expect(screen.queryByText("Partner 9")).not.toBeInTheDocument();
    const expand = screen.getByRole("button", { name: /View all/ });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expand);
    expect(screen.getByText("Partner 9")).toBeVisible();
    const collapse = screen.getByRole("button", { name: "Collapse" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(collapse);
    expect(screen.queryByText("Partner 9")).not.toBeInTheDocument();
  });

  it("shows remove action only for active participants when viewed by the leader", () => {
    render(
      <MemberAvatarGrid members={members} teamId="team-1" canRemoveMembers />,
    );

    expect(
      screen.getByRole("button", { name: "Remove Ada" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Left" }),
    ).not.toBeInTheDocument();
  });

  it("hides member remove actions for non-leader viewers", () => {
    render(
      <MemberAvatarGrid
        members={members}
        teamId="team-1"
        canRemoveMembers={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Remove Ada" }),
    ).not.toBeInTheDocument();
  });
});
