/**
 * P0-D T2 (task #176) — 本地圈子数据 hook
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §3.4 / §6.4
 *
 * cityId 来源（#181 §3.4 起）：
 *   - 登录用户 `user.city` 非空 → `?cityId=${user.city}`（看自己城市圈子，地点维度个性化）
 *   - 未登录 / 未设城市 → 不传 cityId，后端 fallback 深圳（P0-D 方案 a 现状保留）
 *   - user.city 读取走 fetchCurrentUser 两步（get-session + /api/users），与 navbar 同口径
 *
 * 错误 / 空态：
 *   - fetch 失败 or topLocations & neighborTeams 都空 → 消费方整块不渲染（spec §6.4）
 *   - 本 hook 只负责取数 + 归一状态，渲染决策在 section
 */

import * as React from "react";
import { fetchPublicAPI, fetchCurrentUser } from "@/lib/api";
import type { LocalCircle } from "./types";

export type LocalCircleState =
  | { status: "loading" }
  | { status: "ready"; data: LocalCircle }
  | { status: "error"; message: string };

async function fetchLocalCircle(): Promise<LocalCircle> {
  // #181 §3.4：登录用户 user.city 非空 → ?cityId= 看自己城市圈子；
  // 未登录 / 未设城市 → cityId 缺省，后端 fallback 深圳（方案 a）
  const user = await fetchCurrentUser(); // 静默失败，不跳转
  const cityId = user?.city || null;
  const url = cityId
    ? `/local-circle/home?cityId=${encodeURIComponent(cityId)}`
    : "/local-circle/home";
  const res = await fetchPublicAPI(url);
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
