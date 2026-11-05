import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamDepartureBrief } from "./team-detail-overview";
import { TeamDecisionPanel } from "./team-detail-sidebar";
import type { Team } from "@/lib/types";
import type { useTeamDetail } from "./use-team-detail";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    locale: "zh-CN",
    t: (key: string, vars?: Record<string, string>) =>
      vars ? `${key} ${Object.values(vars).join(" ")}` : key,
  }),
}));
const team = {
  id: "team",
  title: "出发",
  startAt: "2099-04-18T15:30:00Z",
  endAt: "2099-04-18T17:30:00Z",
  lifecycle: "pending",
  recruitmentStatus: "open",
  activeParticipantCount: 2,
  maxParticipants: 4,
  meetingPoint: "北门集合",
  leader: { id: "leader", name: "Leader", extra: { wechat: "leader-wechat" } },
  location: { id: "lake", name: "Lake", region: { timezone: "Asia/Shanghai" } },
} as Team;
function renderBrief(visible = true) {
  return render(
    <TeamDepartureBrief
      team={team}
      location={team.location!}
      statusLabel="招募中"
      showMeetingPoint={visible}
    />,
  );
}

describe("departure information", () => {
  it("shows the destination's cross-day end time and copies the meeting point", async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: copy },
    });
    renderBrief();
    expect(screen.getByText(/2099\/04\/19 01:30/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "teams.copyMeetingPoint" }),
    );
    await waitFor(() => expect(copy).toHaveBeenCalledWith("北门集合"));
    expect(await screen.findByText("teams.copySuccess")).toHaveAttribute(
      "role",
      "status",
    );
  });
  it("offers selected text for manual copying when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) },
    });
    renderBrief();
    fireEvent.click(
      screen.getByRole("button", { name: "teams.copyLeaderWechat" }),
    );
    const fallback = await screen.findByRole("textbox", {
      name: "teams.copyLeaderWechat",
    });
    expect(fallback).toHaveValue("leader-wechat");
    expect(fallback).toHaveFocus();
    expect((fallback as HTMLTextAreaElement).selectionEnd).toBe(
      "leader-wechat".length,
    );
  });
  it("hides member details when membership ends even before the DTO refreshes", () => {
    const { rerender } = renderBrief();
    expect(screen.getByText("leader-wechat")).toBeInTheDocument();
    rerender(
      <TeamDepartureBrief
        team={team}
        location={team.location!}
        statusLabel="招募中"
        showMeetingPoint={false}
      />,
    );
    expect(screen.queryByText("leader-wechat")).not.toBeInTheDocument();
    expect(screen.queryByText("北门集合")).not.toBeInTheDocument();
  });
  it.each([
    ["pending", "teams.memberAwaitingDeparture"],
    ["formed", "teams.memberDepartureConfirmed"],
    ["cancelled", "enums.teamStatus.cancelled"],
  ])("explains the member's %s departure state", (lifecycle, expected) => {
    const ctx = {
      team: { ...team, lifecycle },
      isMember: true,
      isLeader: false,
      remaining: 2,
      setShowLeave: vi.fn(),
    } as unknown as ReturnType<typeof useTeamDetail>;
    render(<TeamDecisionPanel ctx={ctx} />);
    expect(screen.getByTestId("team-member-status")).toHaveTextContent(
      expected,
    );
    if (lifecycle === "cancelled")
      expect(
        screen.queryByRole("button", { name: "teams.leaveTeam" }),
      ).toBeNull();
  });
});
