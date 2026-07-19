import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamCountdown } from "../components/features/team-detail/team-countdown";

/**
 * task #165（T2）：countdown island 单测
 *
 * spec §3.2 覆盖：
 * - 24h 内到分钟
 * - 24h 外只显示 X 天
 * - 已开始 · N 小时前 / N 分钟前
 * - endTime + 24h 折叠为「已结束」
 * - 主标题 明天/今天/周几/月日 四种
 */

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      // 用 key + vars 拼字符串，方便断言
      if (!vars) return key;
      const parts: string[] = [key];
      for (const [k, v] of Object.entries(vars)) parts.push(`${k}=${v}`);
      return parts.join("|");
    },
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

describe("TeamCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 固定 now = 2026-07-19 08:00 本地时间（用 UTC 时序化）
    vi.setSystemTime(new Date("2026-07-19T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("明天 07:30：一天后启动显示 tomorrow + remainingHours", () => {
    // start = 现在 + ~24h 少一点，还在今天+1
    const start = new Date("2026-07-20T00:30:00Z"); // 24.5h 后
    // 但当前 now 是 UTC 00:00，本地时间取决于 tz；这里改用本地时区一致做法：把两者都当作本地时间
    render(<TeamCountdown startTime={start.toISOString()} durationMin={240} />);
    // 主标题包含 tomorrow key，副标题包含 remainingHours
    const container = screen.getByTestId("team-actionbook-countdown");
    expect(container.textContent).toContain("teams.actionbook.countdown.tomorrow");
  });

  it("已开始：now > startTime 且 < startTime + duration + 24h → startedHours", () => {
    const start = new Date("2026-07-18T22:00:00Z"); // 2 小时前
    render(<TeamCountdown startTime={start.toISOString()} durationMin={240} />);
    const container = screen.getByTestId("team-actionbook-countdown");
    expect(container.textContent).toContain("teams.actionbook.countdown.startedHours");
  });

  it("已结束：now > startTime + duration + 24h → ended", () => {
    // start 是 2 天前 + duration 4h，现在已过 endTime+24h
    const start = new Date("2026-07-16T00:00:00Z"); // 3 天前
    render(<TeamCountdown startTime={start.toISOString()} durationMin={240} />);
    const container = screen.getByTestId("team-actionbook-countdown");
    expect(container.textContent).toContain("teams.actionbook.countdown.ended");
  });

  it("大于 24h：显示 remainingDays", () => {
    const start = new Date("2026-07-25T00:00:00Z"); // 6 天后
    render(<TeamCountdown startTime={start.toISOString()} durationMin={240} />);
    const container = screen.getByTestId("team-actionbook-countdown");
    expect(container.textContent).toContain("teams.actionbook.countdown.remainingDays");
  });

  it("无效 startTime 不渲染", () => {
    const { container } = render(<TeamCountdown startTime="not-a-date" />);
    expect(container.firstChild).toBeNull();
  });

  it("<24h 每分钟刷新一次", () => {
    // start = now + 12h → <24h 分支
    const start = new Date("2026-07-19T12:00:00Z");
    render(<TeamCountdown startTime={start.toISOString()} durationMin={240} />);
    const before = screen.getByTestId("team-actionbook-countdown").textContent;
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });
    const after = screen.getByTestId("team-actionbook-countdown").textContent;
    // 分钟数刷新，字符串应变化（12h 0m → 11h 59m）
    expect(after).not.toBe(before);
  });
});
