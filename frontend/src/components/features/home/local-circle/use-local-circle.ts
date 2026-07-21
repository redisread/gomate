/**
 * P0-D T2 (task #176) — 本地圈子数据 hook
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §3.4 / §6.4
 *
 * cityId 来源（v1 首版 + Martin PR #406 NIT 方案 a）：
 *   - 后端 `/local-circle/home` cityId 缺省时服务端 fallback 深圳
 *   - 前端不传 cityId → 一个 request 搞定（消除 /cities → /local-circle 串行瀑布）
 *   - 未来接入 user.city / 城市选择器后，传 `?cityId=` 即可（本 hook 加参数即可，无需改后端）
 *
 * 错误 / 空态：
 *   - fetch 失败 or topLocations & neighborTeams 都空 → 消费方整块不渲染（spec §6.4）
 *   - 本 hook 只负责取数 + 归一状态，渲染决策在 section
 */

import * as React from "react";
import { fetchPublicAPI } from "@/lib/api";
import type { LocalCircle } from "./types";

export type LocalCircleState =
  | { status: "loading" }
  | { status: "ready"; data: LocalCircle }
  | { status: "error"; message: string };

async function fetchLocalCircle(): Promise<LocalCircle> {
  // cityId 缺省 → 后端 fallback 深圳（方案 a）
  const res = await fetchPublicAPI("/local-circle/home");
  if (!res.ok) throw new Error(`local-circle HTTP ${res.status}`);
  return (await res.json()) as LocalCircle;
}

export function useLocalCircle(): LocalCircleState {
  const [state, setState] = React.useState<LocalCircleState>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    fetchLocalCircle()
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", data });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[useLocalCircle] fetch failed:", err);
        setState({ status: "error", message: String((err as Error)?.message ?? err) });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
