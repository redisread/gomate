import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamActionbookSection } from "../components/features/team-detail/team-actionbook-section";

/**
 * task #165（T2）CR B1：spec §3.1 隐私红线 —— server 已剥 visitor 的 checklist
 * island 端必须能在 props.checklist = null 时走 visitor 路径
 *
 * 关键断言：
 * - 容器渲染
 * - countdown 仍然显示（startTime 不是隐私）
 * - "empty.visitor" 文案出现
 * - 不出现任何 meetingPoint / gear / assignments / notes 字段的子块
 *   （即便 team.checklist 是 null，SSR HTML 也不会泄露 meetingPoint.name / gear.essential 等）
 */

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("@/components/features/team-detail/team-countdown", () => ({
  TeamCountdown: () => <div data-testid="team-actionbook-countdown">countdown-stub</div>,
}));

vi.mock("@/components/features/team-detail/use-checklist-claims", () => ({
  useChecklistClaims: () => ({
    checklist: null,
    toggleClaim: vi.fn(),
    isPending: () => false,
  }),
}));

const baseTeam = {
  id: "t1",
  locationId: "loc1",
  title: "t",
  description: "",
  date: "2026-07-25",
  time: "07:30",
  startTime: "2026-07-25T00:30:00.000Z",
  duration: "4小时",
  durationMin: 240,
  maxMembers: 10,
  currentMembers: 3,
  requirements: [],
  status: "recruiting",
  createdAt: "2026-07-19T00:00:00Z",
  leader: { id: "u-leader", name: "L", avatar: "", level: "beginner", completedHikes: 0, bio: "" },
  members: [],
  // task #165 CR B1：visitor 拿到 null
  checklist: null,
} as unknown as Parameters<typeof TeamActionbookSection>[0]["team"];

describe("TeamActionbookSection · visitor (task #165 CR B1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未登录访客（checklist=null）→ 只渲染容器 + countdown + visitor 提示", () => {
    render(
      <TeamActionbookSection
        team={baseTeam}
        currentUserId={null}
        isLeader={false}
        isMember={false}
        members={[]}
        onToast={vi.fn()}
        refetchTeam={vi.fn()}
      />,
    );

    expect(screen.getByTestId("team-actionbook-section")).toBeInTheDocument();
    expect(screen.getByTestId("team-actionbook-countdown")).toBeInTheDocument();
    expect(screen.getByText("teams.actionbook.empty.visitor")).toBeInTheDocument();

    // 敏感字段在 SSR HTML 里一个都不能出现
    expect(screen.queryByTestId("team-actionbook-meeting-name")).toBeNull();
    expect(screen.queryByTestId("team-actionbook-cta-complete")).toBeNull(); // leader CTA 不出现
    expect(document.querySelector('[data-testid^="team-actionbook-assignment-"]')).toBeNull();
  });

  it("已登录但非成员（checklist=null）→ 同样走 visitor 路径", () => {
    render(
      <TeamActionbookSection
        team={baseTeam}
        currentUserId={"u-outsider"}
        isLeader={false}
        isMember={false}
        members={[]}
        onToast={vi.fn()}
        refetchTeam={vi.fn()}
      />,
    );

    expect(screen.getByText("teams.actionbook.empty.visitor")).toBeInTheDocument();
    expect(screen.queryByTestId("team-actionbook-meeting-name")).toBeNull();
  });
});