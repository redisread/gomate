import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminTeamSummary, Team } from "@/contracts";
import { AdminTeamsManager } from "./admin-teams-manager";

const api = vi.hoisted(() => ({ fetchAPI: vi.fn() }));
vi.mock("@/lib/api", () => api);
const translate = (key: string) => key;
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: translate, locale: "zh-CN", loading: false }),
}));

function summary(id = "team-1"): AdminTeamSummary {
  return {
    id,
    title: `队伍 ${id}`,
    lifecycle: "completed",
    recruitmentStatus: "closed",
    activeParticipantCount: 2,
    maxParticipants: 9,
    createdAt: "2026-10-15T04:00:00Z",
    leader: { id: "leader", name: "Leader", nickname: "领队" },
    location: { id: "place", name: "梧桐山" },
  };
}
function page(teams = [summary()], nextCursor: string | null = null) {
  return new Response(JSON.stringify({ success: true, teams, nextCursor }));
}
const team: Team = {
  ...summary(),
  activityType: "hiking",
  locationId: "place",
  leaderId: "leader",
  description: "完整活动说明",
  startAt: "2026-10-12T04:00:00Z",
  endAt: "2026-10-12T06:00:00Z",
  formedAt: "2026-10-10T04:00:00Z",
  cancelledAt: null,
  isFull: false,
  requirements: ["带水"],
  updatedAt: "2026-10-15T04:00:00Z",
  meetingPoint: "集合备注",
  participants: [
    {
      userId: "member",
      joinedAt: "2026-10-10T04:00:00Z",
      leftAt: null,
      user: {
        id: "member",
        name: "队员",
        nickname: null,
        image: null,
        bio: null,
        gender: null,
        birthday: null,
        extra: {
          level: "beginner",
          completedHikes: 0,
          wechat: null,
          city: null,
        },
      },
    },
  ],
  leader: {
    id: "leader",
    name: "Leader",
    nickname: "领队",
    image: null,
    bio: null,
    extra: { level: "beginner", completedHikes: 0, wechat: null, city: null },
  },
  location: undefined,
};

describe("read-only administrator team management", () => {
  beforeEach(() => {
    api.fetchAPI.mockReset().mockImplementation(() => Promise.resolve(page()));
    window.history.replaceState({}, "", "/admin/teams");
  });

  it("shows list metadata and distinct translated recruitment and lifecycle statuses", async () => {
    render(<AdminTeamsManager />);
    expect(await screen.findByText("队伍 team-1")).toBeInTheDocument();
    expect(screen.getByText("领队")).toBeInTheDocument();
    expect(screen.getByText("梧桐山")).toBeInTheDocument();
    expect(screen.getByText("2 / 9")).toBeInTheDocument();
    expect(
      screen.getAllByText("enums.teamLifecycle.completed").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("admin.teamsManagement.recruitmentClosed").length,
    ).toBeGreaterThan(0);
  });

  it("searches and filters with a fresh cursor, persisting the URL", async () => {
    render(<AdminTeamsManager />);
    await screen.findByText("队伍 team-1");
    fireEvent.change(screen.getByLabelText("admin.teamsManagement.search"), {
      target: { value: "领队" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "admin.management.search" }),
    );
    fireEvent.change(screen.getByLabelText("admin.teamsManagement.lifecycle"), {
      target: { value: "in_progress" },
    });
    fireEvent.change(
      screen.getByLabelText("admin.teamsManagement.recruitmentStatus"),
      { target: { value: "closed" } },
    );
    await waitFor(() => {
      const path = api.fetchAPI.mock.calls.at(-1)![0] as string;
      const params = new URL(path, "http://localhost").searchParams;
      expect(params.get("q")).toBe("领队");
      expect(params.get("lifecycle")).toBe("in_progress");
      expect(params.get("recruitmentStatus")).toBe("closed");
      expect(params.has("cursor")).toBe(false);
    });
    expect(new URL(window.location.href).searchParams.get("q")).toBe("领队");
  });

  it("ignores an older filter response after a newer request finishes", async () => {
    let resolveOld!: (response: Response) => void;
    api.fetchAPI.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveOld = resolve;
        }),
    );
    render(<AdminTeamsManager />);
    fireEvent.change(screen.getByLabelText("admin.teamsManagement.lifecycle"), {
      target: { value: "completed" },
    });
    await screen.findByText("队伍 team-1");
    await act(async () => resolveOld(page([summary("stale")])));
    expect(screen.queryByText("队伍 stale")).not.toBeInTheDocument();
  });

  it("retries the failed next page with the same filters and preserves existing rows", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(page([summary()], "next"))
      .mockRejectedValueOnce(new Error("private diagnostic"))
      .mockResolvedValueOnce(page([summary("team-2")]));
    render(<AdminTeamsManager initialFilters={{ q: "领队" }} />);
    await screen.findByText("队伍 team-1");
    fireEvent.click(
      screen.getByRole("button", { name: "admin.management.loadMore" }),
    );
    await screen.findByRole("alert");
    expect(screen.getByText("队伍 team-1")).toBeInTheDocument();
    expect(screen.queryByText("private diagnostic")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "admin.teamsManagement.retry" }),
    );
    await screen.findByText("队伍 team-2");
    const params = new URL(
      api.fetchAPI.mock.calls.at(-1)![0] as string,
      "http://localhost",
    ).searchParams;
    expect(params.get("cursor")).toBe("next");
    expect(params.get("q")).toBe("领队");
  });

  it("opens only a read-only detail, includes the leader and closes with Escape", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(page())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, team })),
      );
    render(<AdminTeamsManager />);
    const trigger = await screen.findByRole("button", {
      name: /admin.teamsManagement.viewDetail/,
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("完整活动说明");
    expect(within(dialog).getByText("队员")).toBeInTheDocument();
    expect(within(dialog).getAllByText("领队").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("集合备注")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(
      api.fetchAPI.mock.calls.every(
        ([, options]) => !options?.method || options.method === "GET",
      ),
    ).toBe(true);
  });

  it("restores filters from the initial URL data and browser history", async () => {
    render(
      <AdminTeamsManager
        initialFilters={{ q: "history", lifecycle: "completed" }}
      />,
    );
    await screen.findByText("队伍 team-1");
    expect(screen.getByLabelText("admin.teamsManagement.search")).toHaveValue(
      "history",
    );
    window.history.replaceState(
      {},
      "",
      "/admin/teams?q=restored&recruitmentStatus=closed",
    );
    fireEvent.popState(window);
    await waitFor(() =>
      expect(screen.getByLabelText("admin.teamsManagement.search")).toHaveValue(
        "restored",
      ),
    );
    expect(
      screen.getByLabelText("admin.teamsManagement.lifecycle"),
    ).toHaveValue("");
  });

  it("shows an empty state for a successful query with no teams", async () => {
    api.fetchAPI.mockResolvedValueOnce(page([]));
    render(<AdminTeamsManager />);
    expect(
      await screen.findByText("admin.teamsManagement.noTeams"),
    ).toBeInTheDocument();
  });
});
