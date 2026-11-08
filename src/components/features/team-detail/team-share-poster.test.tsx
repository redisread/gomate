import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamSharePoster } from "./team-share-poster";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  detail: vi.fn(),
  render: vi.fn(),
  t: (key: string) => key,
}));
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: mocks.t, locale: "zh-CN" }),
}));
vi.mock("@/lib/api", () => ({
  fetchAPI: mocks.session,
  fetchPublicAPI: mocks.detail,
}));
vi.mock("./render-team-poster", () => ({ renderTeamPoster: mocks.render }));

const result = {
  blob: new Blob(["png"], { type: "image/png" }),
  coverFallback: false,
};
const team = {
  id: "one",
  title: "Team",
  activityType: "hiking",
  lifecycle: "pending",
  recruitmentStatus: "open",
  isFull: false,
  maxParticipants: 10,
  startAt: "2027-01-01T00:00:00Z",
  endAt: "2027-01-01T03:00:00Z",
};
const response = (body: unknown, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => body,
});

beforeEach(() => {
  mocks.session.mockResolvedValue(response({ user: { id: "viewer" } }));
  mocks.detail.mockResolvedValue(response({ success: true, team }));
  mocks.render.mockResolvedValue(result);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:poster");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function open() {
  render(<TeamSharePoster teamId="one" />);
  fireEvent.click(screen.getByRole("button", { name: "teams.poster.action" }));
}

describe("team poster lifecycle", () => {
  it("checks the live session before loading public data or generating", async () => {
    mocks.session.mockResolvedValue(response({ user: null }, 401));
    open();
    expect(await screen.findByText("teams.poster.loginRequired")).toBeVisible();
    expect(mocks.detail).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
    expect(mocks.session).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("releases the preview URL on close", async () => {
    open();
    expect(await screen.findByRole("img")).toHaveAttribute(
      "src",
      "blob:poster",
    );
    fireEvent.click(screen.getByRole("button", { name: "common.close" }));
    await waitFor(() =>
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:poster"),
    );
  });

  it("keeps a completed preview when the old deadline expires", async () => {
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    open();
    expect(await screen.findByRole("img")).toHaveAttribute(
      "src",
      "blob:poster",
    );
    act(() => deadline.abort());
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:poster");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores a completed render after closing", async () => {
    let complete!: (value: typeof result) => void;
    mocks.render.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    open();
    await waitFor(() => expect(mocks.render).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "common.close" }));
    await act(async () => {
      complete(result);
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("shows a bounded timeout even if the renderer is still awaiting fonts", async () => {
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    let complete!: (value: typeof result) => void;
    mocks.render.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    open();
    await waitFor(() => expect(mocks.render).toHaveBeenCalled());
    act(() => deadline.abort());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "teams.poster.failed",
    );
    await act(async () => {
      complete(result);
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
