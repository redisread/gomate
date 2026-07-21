/**
 * P0-D T2 (task #176) — 本地圈子数据 hook
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §3.4 / §6.4
 *
 * cityId 来源（v1 首版）：
 *   - 首页当前无城市选择器；spec + Martin CR 约定「session/fallback 深圳」
 *   - SessionUser 暂未透出 city 字段（#164 后端加的字段前端未接）→ v1 先用「热门城市第一个（深圳）」
 *   - 未来接入 user.city / 城市选择器后，cityId 从那里取（本 hook signature 不变）
 *
 * 错误 / 空态：
 *   - fetch 失败 or topLocations & neighborTeams 都空 → 消费方整块不渲染（spec §6.4）
 *   - 本 hook 只负责取数 + 归一状态，渲染决策在 section
 */

import * as React from "react";
import { fetchPublicAPI } from "@/lib/api";
import type { LocalCircle } from "./types";

interface CityLite {
  id: string;
  name: string;
  isHot?: boolean;
}

export type LocalCircleState =
  | { status: "loading" }
  | { status: "ready"; data: LocalCircle }
  | { status: "error"; message: string };

/** 默认城市名（fallback），后端也用「深圳」做 cityName fallback */
const DEFAULT_CITY_NAME = "深圳";

async function resolveDefaultCityId(): Promise<string | null> {
  // 取热门城市列表，优先匹配「深圳」，否则取第一个热门城市
  const res = await fetchPublicAPI("/cities?hot=true&pageSize=100");
  if (!res.ok) throw new Error(`cities HTTP ${res.status}`);
  const json = (await res.json()) as { cities?: CityLite[] };
  const cities = json.cities ?? [];
  if (cities.length === 0) return null;
  const shenzhen = cities.find((c) => c.name === DEFAULT_CITY_NAME);
  return (shenzhen ?? cities[0]).id;
}

async function fetchLocalCircle(cityId: string): Promise<LocalCircle> {
  const res = await fetchPublicAPI(`/local-circle/home?cityId=${encodeURIComponent(cityId)}`);
  if (!res.ok) throw new Error(`local-circle HTTP ${res.status}`);
  return (await res.json()) as LocalCircle;
}

export function useLocalCircle(): LocalCircleState {
  const [state, setState] = React.useState<LocalCircleState>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cityId = await resolveDefaultCityId();
        if (cancelled) return;
        if (!cityId) {
          // 无任何城市数据 → 视为空态（section 不渲染）
          setState({ status: "error", message: "no city" });
          return;
        }
        const data = await fetchLocalCircle(cityId);
        if (cancelled) return;
        setState({ status: "ready", data });
      } catch (err) {
        if (cancelled) return;
        console.error("[useLocalCircle] fetch failed:", err);
        setState({ status: "error", message: String((err as Error)?.message ?? err) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
