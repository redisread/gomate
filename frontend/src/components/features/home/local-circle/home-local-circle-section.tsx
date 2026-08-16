/**
 * 首页本地圈子：公共 Region 聚合与每请求计算的个性化邻居队伍。
 * 请求失败或双空时静默降级，不阻塞首页其余内容；加载态固定高度以避免 CLS。
 */

"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { useLocalCircle } from "./use-local-circle";
import { LocalCircleCard } from "./local-circle-card";
import { NeighborTeamRow } from "./neighbor-team-row";

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

  const { regionName, activePeopleCount, topLocations, neighborTeams } = state.data;
  const { loggedIn, userRegionId } = state;

  // 登录 + 未设置 Region + 邻居子区块空 → 显示设置地区引导。
  const showGuideCard = loggedIn && !userRegionId && neighborTeams.length === 0;

  // 空态：地点 + 邻居队伍都空 → 整块不渲染（非占位，spec §6.4）
  // 两者独立空态：主区块随 topLocations，子区块随 neighborTeams
  // 引导卡视为子区块内容，登录未设置 Region 时即使双空也保留入口。
  if (topLocations.length === 0 && neighborTeams.length === 0 && !showGuideCard) return null;

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
          {/* Region dynamic 前缀「{region} {n} 人在行动」——0 人时不显示，避免
              「深圳 · 0 人在行动」这类负向空态文案劝退（UX 审计发现） */}
          {activePeopleCount > 0 && (
            <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              {regionName} · {t("home.localCircle.inAction", { n: activePeopleCount })}
            </p>
          )}
        </div>

        {/* 主区块：Top 3 地点卡（移动端竖排，md+ 三列）—— topLocations 非空才渲染 */}
        {topLocations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {topLocations.map((loc, i) => (
              <LocalCircleCard key={loc.locationId} location={loc} index={i} />
            ))}
          </div>
        )}

        {/* 登录未设置 Region 时展示引导卡。 */}
        {showGuideCard && (
          <div className="mt-8 sm:mt-10 flex justify-center" data-testid="region-guide-card">
            <div className="w-full max-w-md rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-6 py-6 text-center">
              <p className="text-base font-medium text-stone-800 dark:text-stone-200 leading-relaxed">
                {t("home.localCircle.setRegionCta.title")}
              </p>
              <a
                href="/profile/edit"
                className="mt-4 inline-flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
              >
                {t("home.localCircle.setRegionCta.button")}
              </a>
            </div>
          </div>
        )}

        {/* 子区块：邻居队伍「你的邻居参加了这些队伍」（T3 A-1）——
            neighborTeams 非空才渲染，行式布局视觉层级次于主区块地点卡 */}
        {neighborTeams.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
              {t("home.localCircle.neighborTeams.title")}
            </h3>
            <div className="flex flex-col gap-3">
              {neighborTeams.map((team) => (
                <NeighborTeamRow key={team.teamId} team={team} regionName={regionName} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
