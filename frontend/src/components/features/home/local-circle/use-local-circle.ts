/**
 * 本地圈子数据 hook。
 *
 * regionId 来源：
 *   - 登录用户 `user.extra.city` 非空 → `?regionId=${user.extra.city}`（该 storage key 保存 Region id）
 *   - 未登录 / 未设置 Region → 不传 regionId，后端稳定 fallback 深圳
 *   - user.extra.city 读取走 fetchCurrentUser，与 navbar 同口径
 *
 * 错误 / 空态：
 *   - fetch 失败或 topLocations 与 neighborTeams 都空 → 消费方整块不渲染
 *   - 本 hook 只负责取数 + 归一状态，渲染决策在 section
 */

import * as React from "react";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import type { LocalCircle } from "./types";

export type LocalCircleState =
  | { status: "loading" }
  // 引导卡显隐判定用：loggedIn 区分匿名与登录未设置 Region。
  | { status: "ready"; data: LocalCircle; loggedIn: boolean; userRegionId: string | null }
  | { status: "error"; message: string };

async function fetchLocalCircle(): Promise<{ data: LocalCircle; loggedIn: boolean; userRegionId: string | null }> {
  // `user.extra.city` 是 V2 持久化的 Region id；匿名或空值时由后端稳定 fallback 深圳。
  const user = await fetchCurrentUser(); // 静默失败，不跳转
  const regionId = user?.extra.city || null;
  const url = regionId
    ? `/local-circle/home?regionId=${encodeURIComponent(regionId)}`
    : "/local-circle/home";
  // The response combines a public cached aggregate with per-session neighbor
  // teams, so the same-origin cookie must remain available to the Worker.
  const res = await fetchAPI(url);
  if (!res.ok) throw new Error(`local-circle HTTP ${res.status}`);
  return { data: (await res.json()) as LocalCircle, loggedIn: !!user, userRegionId: regionId };
}

export function useLocalCircle(): LocalCircleState {
  const [state, setState] = React.useState<LocalCircleState>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    fetchLocalCircle()
      .then(({ data, loggedIn, userRegionId }) => {
        if (cancelled) return;
        setState({ status: "ready", data, loggedIn, userRegionId });
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
