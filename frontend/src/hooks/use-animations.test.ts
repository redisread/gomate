import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSearchInteraction } from "./use-animations";

describe("useSearchInteraction", () => {
  it("输入时只更新搜索值，不为每个字符触发按钮弹跳", () => {
    const { result } = renderHook(() => useSearchInteraction());

    act(() => {
      result.current.setValue("梧桐山");
    });

    expect(result.current.value).toBe("梧桐山");
    expect(result.current).not.toHaveProperty("isButtonBouncing");
    expect(result.current).not.toHaveProperty("triggerButtonBounce");
  });
});
