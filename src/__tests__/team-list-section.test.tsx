import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamListSection } from "../components/features/location-detail/team-list-section";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ fetchAPI: fetchMock }));
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("../components/features/location-detail/team-card", () => ({
  TeamCard: ({ team }: { team: { title: string } }) => <div>{team.title}</div>,
}));
const response = (teams: { title: string }[] = []) => ({
  ok: true,
  json: async () => ({
    success: true,
    teams,
    total: teams.length,
    nextCursor: null,
  }),
});

describe("Location teams loading and recovery", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(cleanup);

  it("shows loading instead of claiming there are no teams", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<TeamListSection locationId="loc-1" />);
    expect(screen.getByRole("status")).toHaveTextContent("common.loading");
    expect(
      screen.queryByText("locations.detailNoTeamsDesc"),
    ).not.toBeInTheDocument();
  });

  it("distinguishes a failed request from empty and retries without hiding the section", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce(response([{ title: "一起看日出" }]));
    render(<TeamListSection locationId="loc-1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "locationDetail.teamsLoadFailed",
    );
    expect(
      screen.queryByText("locations.detailNoTeamsDesc"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
    expect(await screen.findByText("一起看日出")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("turns a stalled request into a retryable error after the timeout", async () => {
    const timeout = new AbortController();
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timeout.signal);
    fetchMock.mockImplementation(
      (_path: string, options: RequestInit) =>
        new Promise((_resolve, reject) =>
          options.signal!.addEventListener("abort", () =>
            reject(new DOMException("timeout", "TimeoutError")),
          ),
        ),
    );
    render(<TeamListSection locationId="loc-1" />);
    await act(async () => timeout.abort());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "locationDetail.teamsLoadFailed",
    );
    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    timeoutSpy.mockRestore();
  });

  it("shows a single empty message and leaves create actions to the page", async () => {
    fetchMock.mockResolvedValue(response());
    render(<TeamListSection locationId="loc-1" />);
    expect(
      await screen.findAllByText("locations.detailNoTeamsDesc"),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("link", { name: "locations.detailCreateTeam" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "locations.detailNoTeamsBtn" }),
    ).not.toBeInTheDocument();
  });

  it("ignores a late response for a previous location", async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void;
    fetchMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
      )
      .mockResolvedValueOnce(response([{ title: "新地点队伍" }]));
    const { rerender } = render(<TeamListSection locationId="old" />);
    rerender(<TeamListSection locationId="new" />);
    expect(await screen.findByText("新地点队伍")).toBeInTheDocument();
    resolveOld(response([{ title: "旧地点队伍" }]));
    await waitFor(() =>
      expect(screen.queryByText("旧地点队伍")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("新地点队伍")).toBeInTheDocument();
  });
});
