import { describe, expect, it } from "vitest";
import { isValidDraftShape } from "./use-story-form";

// task #157：损坏草稿恢复前 shape 校验（Steven 裁决：非法草稿丢弃并提示重新编辑）
describe("isValidDraftShape（草稿 shape 校验）", () => {
  it("合法草稿通过", () => {
    expect(isValidDraftShape({ title: "标题", tags: ["徒步", "露营"] })).toBe(
      true,
    );
    expect(isValidDraftShape({})).toBe(true); // 空草稿对象合法（spread 无效果）
    expect(
      isValidDraftShape({
        title: "t",
        summary: "s",
        content: "c",
        images: ["https://gomate.cos/story.jpg"],
        teamId: "",
        locationId: "loc_1",
        locationName: "梧桐山",
        tags: [],
        status: "draft",
        authorId: "u_1",
      }),
    ).toBe(true);
  });

  it("tags 非字符串数组 → 非法（Wen 实测的滑稽计数来源）", () => {
    expect(isValidDraftShape({ tags: "徒步" })).toBe(false);
    expect(isValidDraftShape({ tags: { 0: "徒步" } })).toBe(false);
    expect(isValidDraftShape({ tags: [1, 2] })).toBe(false);
    expect(isValidDraftShape({ tags: null })).toBe(false);
  });

  it("字符串字段类型错 → 非法", () => {
    expect(isValidDraftShape({ title: 123 })).toBe(false);
    expect(isValidDraftShape({ content: {} })).toBe(false);
    expect(isValidDraftShape({ status: ["draft"] })).toBe(false);
  });

  it("混入未知字段 → 非法（spread 会污染 form state）", () => {
    expect(isValidDraftShape({ title: "t", hacker: "x" })).toBe(false);
    expect(
      isValidDraftShape({ coverImage: "https://legacy.example/story.jpg" }),
    ).toBe(false);
  });

  it("非对象 → 非法", () => {
    expect(isValidDraftShape(null)).toBe(false);
    expect(isValidDraftShape("draft")).toBe(false);
    expect(isValidDraftShape([1, 2])).toBe(false);
    expect(isValidDraftShape(42)).toBe(false);
  });
});
