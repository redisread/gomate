// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Team } from "@/lib/types";
import {
  LocationStoryRecapFeed,
  TeamStoryRecapFeed,
} from "./story-recap-feed";
import type { StoryV2 } from "./story-contract";

const apiGetMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiGet: (path: string) => apiGetMock(path),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("./story-card", () => ({
  StoryCard: ({ story }: { story: StoryV2 }) => (
    <a href={`/discover/${story.id}`}>{story.displayTitle}</a>
  ),
}));

const story = {
  id: "story-1",
  authorId: "user-1",
  teamId: "team-1",
  locationId: "location-1",
  title: null,
  displayTitle: "梧桐山回顾",
  summary: null,
  content: "顺利完成行程。",
  images: [],
  status: "published",
  viewCount: 0,
  likeCount: 0,
  createdAt: "2026-08-16T08:00:00.000Z",
  updatedAt: "2026-08-16T08:00:00.000Z",
  author: { id: "user-1", name: "Victor", image: null },
  location: { id: "location-1", name: "梧桐山", slug: "wutong" },
  team: { id: "team-1", title: "周末徒步队" },
  tags: [],
  isLiked: false,
} satisfies StoryV2;

const completedTeam = {
  id: "team-1",
  locationId: "location-1",
  leaderId: "leader-1",
  activityType: "hiking",
  title: "周末徒步队",
  description: null,
  startAt: "2026-08-15T00:00:00.000Z",
  endAt: "2026-08-15T04:00:00.000Z",
  maxParticipants: 6,
  activeParticipantCount: 2,
  requirements: [],
  recruitmentStatus: "closed",
  formedAt: "2026-08-14T00:00:00.000Z",
  cancelledAt: null,
  lifecycle: "completed",
  isFull: false,
  checklist: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-15T04:00:00.000Z",
} satisfies Team;

describe("Story recap feeds", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("loads a location feed and follows the opaque nextCursor", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        success: true,
        data: { items: [story], nextCursor: "opaque/cursor" },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [{ ...story, id: "story-2", displayTitle: "第二篇回顾" }],
          nextCursor: null,
        },
      });

    render(<LocationStoryRecapFeed locationId="location 1" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByText("梧桐山回顾")).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenNthCalledWith(
      1,
      "/stories?limit=4&locationId=location+1",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "content.storyRecap.loadMore" }),
    );

    expect(await screen.findByText("第二篇回顾")).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenNthCalledWith(
      2,
      "/stories?limit=4&cursor=opaque%2Fcursor&locationId=location+1",
    );
  });

  it("shows explicit empty and retryable error states", async () => {
    apiGetMock.mockResolvedValueOnce({
      success: true,
      data: { items: [], nextCursor: null },
    });
    const { unmount } = render(
      <LocationStoryRecapFeed locationId="location-1" />,
    );
    expect(
      await screen.findByText("content.storyRecap.emptyLocation"),
    ).toBeInTheDocument();
    unmount();

    apiGetMock.mockReset();
    apiGetMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        success: true,
        data: { items: [], nextCursor: null },
      });
    render(<LocationStoryRecapFeed locationId="location-1" />);
    expect(
      await screen.findByText("content.storyRecap.loadError"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "content.storyRecap.retry" }),
    );
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(2));
  });

  it("shows the team recap entry only to a completed team's leader or active member", async () => {
    apiGetMock.mockResolvedValue({
      success: true,
      data: { items: [], nextCursor: null },
    });

    const { rerender } = render(
      <TeamStoryRecapFeed
        team={completedTeam}
        isLeader
        isMember={false}
      />,
    );
    expect(
      await screen.findByRole("link", {
        name: "content.storyRecap.publish",
      }),
    ).toHaveAttribute("href", "/discover/create?teamId=team-1");

    rerender(
      <TeamStoryRecapFeed
        team={completedTeam}
        isLeader={false}
        isMember
      />,
    );
    expect(
      screen.getByRole("link", { name: "content.storyRecap.publish" }),
    ).toBeInTheDocument();

    rerender(
      <TeamStoryRecapFeed
        team={completedTeam}
        isLeader={false}
        isMember={false}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "content.storyRecap.publish" }),
    ).not.toBeInTheDocument();

    rerender(
      <TeamStoryRecapFeed
        team={{ ...completedTeam, lifecycle: "in_progress" }}
        isLeader
        isMember={false}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "content.storyRecap.publish" }),
    ).not.toBeInTheDocument();
  });
});
