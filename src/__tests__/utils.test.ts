import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";

describe("cn() - Tailwind 类名合并工具", () => {
  it("合并多个类名字符串", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("忽略 falsy 值（undefined、false、null）", () => {
    expect(cn("px-4", undefined, false, null, "py-2")).toBe("px-4 py-2");
  });

  it("条件类名：条件为 true 时包含", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });

  it("条件类名：条件为 false 时排除", () => {
    const isActive = false;
    expect(cn("base", isActive && "active")).toBe("base");
  });

  it("Tailwind 冲突类名：后者覆盖前者（twMerge 行为）", () => {
    // px-4 和 px-2 冲突，后者 px-2 胜出
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("Tailwind 冲突：text-red-500 被 text-blue-500 覆盖", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("空参数返回空字符串", () => {
    expect(cn()).toBe("");
  });

  it("支持对象语法（clsx 特性）", () => {
    expect(cn({ "font-bold": true, "text-sm": false })).toBe("font-bold");
  });

  it("支持数组语法", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });
});
