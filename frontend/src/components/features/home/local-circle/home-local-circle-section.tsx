/**
 * P0-D T2 (task #176) — 首页本地圈子模块
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §4 / §6
 *   - 挂在 P0-C 推荐位之后 / Locations 之前（home-main.tsx）
 *   - 消费 GET /api/local-circle/home?cityId=（useLocalCircle hook）
 *   - 标题「{cityName} {activePeopleCount} 人在行动」+ 副标题
 *   - Top 3 地点卡（LocalCircleCard）
 *   - 空态整块不渲染（topLocations 空 → return null，spec §6.4）
 *   - 错误降级：fetch 失败 → return null，不阻塞首页其他模块（Martin CR）
 *   - skeleton 固定高度防 CLS
 *
 * 注：邻居队伍子区块（neighborTeams 渲染）归 T3（task #177），
 * 待 D2 spec 歧义拍板后在本 section 内追加。T2 只做 topLocations。
 */

"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { useLocalCircle } from "./use-local-circle";
import { LocalCircleCard } from "./local-circle-card";

export function HomeLocalCircleSection() {
  const { t } = useI18n(["home"]);
  const state = useLocalCircle();

  // Skeleton：固定高度防 CLS（Martin CR：P0-D 数据异步，占位高度稳定）
  if (state.status === "loading") {
    return (
      <section
        className="py-12 sm:py-16 lg:py-20 bg-background"
        data-testid="home-local-circle-loading"
        aria-hidden="true"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <div className="h-7 w-56 mx-auto rounded bg-stone-200 dark:bg-stone-800 animate-pulse" />
            <div className="mt-4 h-5 w-72 mx-auto rounded bg-stone-100 dark:bg-stone-900 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-stone-100 dark:bg-stone-900 animate-pulse aspect-[16/10]"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 错误态 or 空态：整块不渲染（spec §6.4 + Martin CR 降级不阻塞首页）
  if (state.status === "error") return null;

  const { cityName, activePeopleCount, topLocations } = state.data;

  // 空态：无地点数据 → 整块不渲染（非占位）
  if (topLocations.length === 0) return null;

  return (
    <section
      id="local-circle"
      className="py-12 sm:py-16 lg:py-20 bg-background"
      data-testid="home-local-circle-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            {t("home.localCircle.title")}
          </h2>
          <p className="text-stone-700 dark:text-stone-300 max-w-xl mx-auto leading-relaxed text-base sm:text-lg">
            {t("home.localCircle.subtitle")}
          </p>
          {/* 城市 dynamic 前缀「{city} {n} 人在行动」 */}
          <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            {cityName} · {t("home.localCircle.inAction", { n: activePeopleCount })}
          </p>
        </div>

        {/* Top 3 地点卡：移动端竖排，md+ 三列 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {topLocations.map((loc, i) => (
            <LocalCircleCard key={loc.locationId} location={loc} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
