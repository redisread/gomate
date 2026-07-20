/**
 * P0-C T2 (task #173) — 首页「本周去这三个」推荐区块
 *
 * spec §3.3 / §5.2 / §7.3 / §7.4：
 *  - 挂在 Hero 之后 / Locations 之前（home-main.tsx）
 *  - 首次挂载 fetch `/api/recommendations/home?seed=<random>` 或不带 seed（服务端生成）
 *  - 「换一批」按钮 → 用返回的 nextSeed 再打一次
 *  - 移动端竖排堆叠 + 「换一批」sticky 底部（本 section 内 sticky，不做全屏）
 *  - 整块三类全空 → 不渲染整个 section（P0-A 空态一致）
 *  - error 态展示手动重试（不静默 return null，spec §7.4 空态 !== error 态）
 *  - seed 只在内存态，不入 cookie / localStorage（spec §5.2 v1.1 隐私）
 */

"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchPublicAPI } from "@/lib/api";
import { RecommendationCard } from "./recommendation-card";
import type { Recommendation, RecommendationsResponse } from "./types";

type FetchState =
  | { status: "loading" }
  | { status: "ready"; recommendations: Recommendation[]; nextSeed: string }
  | { status: "error"; message: string };

async function fetchRecommendations(seed?: string): Promise<RecommendationsResponse> {
  const path = seed
    ? `/api/recommendations/home?seed=${encodeURIComponent(seed)}`
    : `/api/recommendations/home`;
  const res = await fetchPublicAPI(path);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as RecommendationsResponse;
}

export function HomeRecommendationsSection() {
  const { t } = useI18n(["home", "enums"]);
  const [state, setState] = React.useState<FetchState>({ status: "loading" });
  const [refreshing, setRefreshing] = React.useState(false);

  // 抽出首次/重试共用的加载逻辑
  const loadInitial = React.useCallback(() => {
    setState({ status: "loading" });
    let cancelled = false;
    fetchRecommendations()
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "ready",
          recommendations: data.recommendations,
          nextSeed: data.nextSeed,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[HomeRecommendations] fetch failed:", err);
        setState({ status: "error", message: String(err?.message ?? err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const cleanup = loadInitial();
    return cleanup;
  }, [loadInitial]);

  const handleRefresh = React.useCallback(async () => {
    if (state.status !== "ready" || refreshing) return;
    setRefreshing(true);
    try {
      const data = await fetchRecommendations(state.nextSeed);
      setState({
        status: "ready",
        recommendations: data.recommendations,
        nextSeed: data.nextSeed,
      });
    } catch (err) {
      console.error("[HomeRecommendations] refresh failed:", err);
      // 保留已展示的推荐，只提示错误
    } finally {
      setRefreshing(false);
    }
  }, [state, refreshing]);

  // 空态：三类全空 → 不渲染整个 section（spec §7.4）
  if (state.status === "ready" && state.recommendations.length === 0) {
    return null;
  }

  // Error 态：Martin CR B2 —— 不静默 return null，展示 error banner + 手动重试
  // spec §7.4 明确「整块空 → 不渲染」是空态，与 fetch error 不同语义
  if (state.status === "error") {
    return (
      <section
        className="py-6 text-center text-sm text-muted-foreground"
        data-testid="home-recommendations-error"
      >
        <span>{t("home.recommendations.error")}</span>
        <button
          type="button"
          onClick={loadInitial}
          className="ml-2 inline-flex items-center gap-1 underline hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
          data-testid="recommendation-retry-btn"
          aria-label={t("home.recommendations.error")}
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
      </section>
    );
  }

  return (
    <section
      id="recommendations"
      className="py-12 sm:py-16 lg:py-20 bg-background"
      data-testid="home-recommendations-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
            {t("home.recommendations.title")}
          </span>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed text-base sm:text-lg">
            {t("home.recommendations.subtitle")}
          </p>
        </div>

        {/* Cards grid */}
        {state.status === "loading" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-lg border bg-muted animate-pulse"
                data-testid="recommendation-card-skeleton"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {state.recommendations.map((reco) => (
              <RecommendationCard key={reco.locationId} reco={reco} />
            ))}
          </div>
        )}

        {/* Refresh CTA — 桌面居中；移动端 sticky 底部
            Martin CR B1: 用 w-fit + mx-auto 让容器只覆盖按钮宽度，避免 sticky 容器矩形挡住卡片点击 */}
        {state.status === "ready" && (
          <div className="mt-6 sm:mt-8 md:static sticky bottom-4 z-10 w-fit mx-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/95 dark:bg-neutral-900/95 border border-border shadow-md hover:shadow-lg backdrop-blur text-sm font-medium text-foreground hover:text-amber-700 dark:hover:text-amber-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="recommendation-refresh-btn"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                strokeWidth={2.2}
              />
              {t("home.recommendations.cta.refresh")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
