import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AboutContent,
  type AboutCopy,
} from "../components/features/about-content";

const copy: AboutCopy = {
  breadcrumbHome: "首页",
  breadcrumbCurrent: "关于我们",
  eyebrow: "关于 GoMate",
  title: "让想去的地方，变成一起出发",
  subtitle: "GoMate 把地点、出发时间和同行者放在一起。",
  primaryAction: "探索地点",
  secondaryAction: "寻找队伍",
  journeyLabel: "一次清晰的出发",
  journeyPlace: "找到想去的地方",
  journeyTeam: "看清队伍安排",
  journeyDeparture: "和合适的人出发",
  missionEyebrow: "我们为什么做 GoMate",
  missionTitle: "降低从想法到出发之间的阻力",
  missionDescription: "把分散的信息收拢为可以行动的计划。",
  capabilitiesTitle: "GoMate 能帮你做什么",
  capabilities: [
    { title: "发现地点", description: "浏览地点信息。" },
    { title: "找到队伍", description: "查看队伍安排。" },
    { title: "准备出发", description: "一起确认行动清单。" },
  ],
  principlesEyebrow: "社区原则",
  principlesTitle: "同行，从清楚和尊重开始",
  principlesDescription: "我们希望每次组队都有清晰的信息与边界。",
  principles: [
    { title: "信息透明", description: "说清楚计划。" },
    { title: "尊重边界", description: "尊重每个人的选择。" },
    { title: "安全优先", description: "出发前做好判断。" },
  ],
  safetyTitle: "出发前，请保持自己的判断",
  safetyDescription: "GoMate 提供信息与协作工具，不替代专业服务和个人判断。",
  contactEyebrow: "保持联系",
  contactTitle: "一起把出发变得更简单",
  contactDescription: "欢迎把反馈与合作想法告诉我们。",
  contactAction: "发送邮件",
};

describe("AboutContent", () => {
  it("按品牌定位、产品能力、社区原则和联系行动组织页面", () => {
    render(<AboutContent copy={copy} />);

    expect(
      screen.getByRole("heading", { level: 1, name: copy.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: copy.missionTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: copy.principlesTitle }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: copy.contactTitle }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("提供清晰且可键盘访问的探索、组队和联系入口", () => {
    render(<AboutContent copy={copy} />);

    expect(
      screen.getByRole("link", { name: copy.primaryAction }),
    ).toHaveAttribute("href", "/locations");
    expect(
      screen.getByRole("link", { name: copy.secondaryAction }),
    ).toHaveAttribute("href", "/teams");
    expect(
      screen.getByRole("link", { name: new RegExp(copy.contactAction) }),
    ).toHaveAttribute("href", "mailto:hi@gomate.live");
  });
});
