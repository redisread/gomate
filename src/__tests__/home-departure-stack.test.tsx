import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeDepartureStack } from "../components/features/home/home-departure-stack";
import type { Team } from "../lib/types";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const teams: Team[] = ["周末去梧桐山", "海边日落散步", "城市骑行计划"].map(
  (title, index) =>
    ({
      id: `team-${index}`,
      locationId: `location-${index}`,
      leaderId: `leader-${index}`,
      activityType: "hiking",
      title,
      description: `${title}的活动介绍`,
      startAt: "2026-08-16T09:00:00.000Z",
      endAt: "2026-08-16T13:00:00.000Z",
      maxParticipants: 6,
      activeParticipantCount: index + 2,
      requirements: [],
      recruitmentStatus: "open",
      formedAt: null,
      cancelledAt: null,
      lifecycle: "pending",
      isFull: false,
      checklist: null,
      createdAt: "2026-08-01",
      updatedAt: "2026-08-01",
      leader: {
        id: `leader-${index}`,
        name: `领队 ${index + 1}`,
        nickname: null,
        image: null,
        bio: "",
        extra: { level: "beginner", completedHikes: 0, wechat: null, city: null },
      },
      location: {
        id: `location-${index}`,
        regionId: "region-1",
        name: `地点 ${index + 1}`,
        slug: `location-${index}`,
        supportedActivityTypes: ["hiking"],
        status: "published",
        subtitle: null,
        description: "",
        address: null,
        latitude: 0,
        longitude: 0,
        coverImageUrl: `/images/location-${index}.jpg`,
        images: [],
        extra: {},
        createdAt: "2026-08-01",
        updatedAt: "2026-08-01",
      },
    }),
);

describe("HomeDepartureStack", () => {
  it("只有一支队伍时保持单卡模式且不显示切换控件", () => {
    render(<HomeDepartureStack teams={teams.slice(0, 1)} />);

    expect(screen.getAllByTestId("guest-departure-card")).toHaveLength(1);
    expect(screen.getByTestId("guest-departure-card")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: "home.departures.next" }),
    ).not.toBeInTheDocument();
  });

  it("把三支队伍渲染为可切换且不会撑宽首页的牌组", () => {
    render(<HomeDepartureStack teams={teams} />);

    const carousel = screen.getByRole("region", {
      name: "home.departures.carouselLabel",
    });
    const cards = screen.getAllByTestId("guest-departure-card");

    expect(carousel).toHaveClass("min-w-0");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveAttribute("data-active", "true");
    expect(cards[1]).toHaveAttribute("data-active", "false");

    fireEvent.click(
      screen.getByRole("button", { name: "home.departures.next" }),
    );

    expect(cards[0]).toHaveAttribute("data-active", "false");
    expect(cards[1]).toHaveAttribute("data-active", "true");

    fireEvent.keyDown(carousel, { key: "ArrowLeft" });

    expect(cards[0]).toHaveAttribute("data-active", "true");
  });

  it("横向拖动会将下一张队伍卡移到最上层", () => {
    render(<HomeDepartureStack teams={teams} />);

    const viewport = screen.getByTestId("guest-departure-viewport");
    const cards = screen.getAllByTestId("guest-departure-card");

    fireEvent.pointerDown(viewport, {
      clientX: 260,
      pointerId: 1,
      pointerType: "touch",
    });
    fireEvent.pointerMove(viewport, {
      clientX: 120,
      pointerId: 1,
      pointerType: "touch",
    });
    fireEvent.pointerUp(viewport, {
      clientX: 120,
      pointerId: 1,
      pointerType: "touch",
    });

    expect(cards[0]).toHaveAttribute("data-active", "false");
    expect(cards[1]).toHaveAttribute("data-active", "true");

    const draggedCardLink = cards[0].querySelector("a");
    const clickEvent = createEvent.click(draggedCardLink!);
    fireEvent(draggedCardLink!, clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
  });
});
