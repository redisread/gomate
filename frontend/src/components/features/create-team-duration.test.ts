import { describe, expect, it } from "vitest";
import { snapToDurationOption } from "@/lib/duration-options";

// task #160（Steven 口径）：推荐值 snap 到最近下拉选项，并列取较长档（徒步宁多勿少）
describe("snapToDurationOption（建队推荐时长 snap）", () => {
  it("精确命中选项时原值返回", () => {
    for (const v of [60, 90, 120, 180, 240, 300, 360, 420, 480, 540, 600, 720, 900, 1200]) {
      expect(snapToDurationOption(v)).toBe(v);
    }
  });

  it("并列时取较长一档", () => {
    expect(snapToDurationOption(150)).toBe(180); // 梧桐山 (120+180)/2=150，|120|=|180|=30 → 180
    expect(snapToDurationOption(75)).toBe(90);   // 凤凰山
    expect(snapToDurationOption(105)).toBe(120); // 大南山
    expect(snapToDurationOption(390)).toBe(420); // 牛奶排
  });

  it("非并列取最近项", () => {
    expect(snapToDurationOption(255)).toBe(240); // 大雁顶 |240|=15 < |300|=45
    expect(snapToDurationOption(100)).toBe(90);  // |90|=10 < |120|=20
    expect(snapToDurationOption(500)).toBe(480); // |480|=20 < |540|=40
  });

  it("超出选项范围钳制到端点", () => {
    expect(snapToDurationOption(45)).toBe(60);   // 莲花山，低于最小档
    expect(snapToDurationOption(1)).toBe(60);
    expect(snapToDurationOption(1500)).toBe(1200); // 高于最大档
  });

  it("难度兜底推荐值本身在选项集内（snap 为恒等）", () => {
    expect(snapToDurationOption(180)).toBe(180); // easy
    expect(snapToDurationOption(300)).toBe(300); // moderate
    expect(snapToDurationOption(420)).toBe(420); // hard
    expect(snapToDurationOption(600)).toBe(600); // expert
  });
});
