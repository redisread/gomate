// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateStoryClient } from "./create-story-client";

const fetchAPIMock = vi.fn();
const fetchCurrentUserMock = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchAPI: (path: string, options?: RequestInit) =>
    fetchAPIMock(path, options),
  fetchCurrentUser: (redirect?: string) => fetchCurrentUserMock(redirect),
  getApiErrorMessage: (_payload: unknown, fallback: string) => fallback,
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("./discover/vditor-editor", () => ({
  VditorEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="story-content-editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe("CreateStoryClient team recap", () => {
  beforeEach(() => {
    fetchAPIMock.mockReset();
    fetchCurrentUserMock.mockReset();
    fetchCurrentUserMock.mockResolvedValue({ id: "member-1" });
  });

  it("preserves teamId and the strict imageKeys contract without requiring a title", async () => {
    fetchAPIMock.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    });

    render(<CreateStoryClient teamId="team-1" />);

    expect(
      await screen.findByText("content.storyRecap.createContext"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("content.discover.create.locationLabel"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "content.discover.back" })).toHaveAttribute(
      "href",
      "/teams/team-1",
    );

    fireEvent.change(screen.getByLabelText("story-content-editor"), {
      target: { value: "队伍回顾正文" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "content.discover.create.submit" }),
    );

    await waitFor(() => expect(fetchAPIMock).toHaveBeenCalledTimes(1));
    const [path, options] = fetchAPIMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/stories");
    expect(JSON.parse(String(options.body))).toEqual({
      teamId: "team-1",
      summary: null,
      content: "队伍回顾正文",
      tags: [],
    });
  });
});
