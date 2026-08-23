import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const i18nMocks = vi.hoisted(() => ({
  getLocale: vi.fn(() => "zh-CN" as const),
  getNamespaceData: vi.fn(() => ({ home: "首页" })),
  loadNamespaces: vi.fn(async () => ({ nav: { home: "首页" } })),
  t: vi.fn(() => "首页"),
}));

vi.mock("@/i18n", () => i18nMocks);

import { useI18n } from "./useI18n";

describe("useI18n hydration", () => {
  it("keeps the first client render aligned with SSR when namespaces are cached", async () => {
    const firstRender: Array<{ loading: boolean; text: string; data: unknown }> = [];
    const { result } = renderHook(() => {
      const state = useI18n(["nav"]);
      firstRender.push({
        loading: state.loading,
        text: state.t("nav.home"),
        data: state.getNsData(),
      });
      return state;
    });

    expect(firstRender[0]).toEqual({ loading: true, text: "", data: null });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.t("nav.home")).toBe("首页");
    expect(result.current.getNsData()).toEqual({ nav: { home: "首页" } });
  });
});
