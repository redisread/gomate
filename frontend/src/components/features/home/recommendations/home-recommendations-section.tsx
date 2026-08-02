/**
 * P0-C T2 (task #173) — 首页「本周去这三个」推荐区块
 * Round 3 T2 (task #200) — 换一批过渡动效
 *
 * spec §3.3 / §5.2 / §7.3 / §7.4：
 *  - 挂在 Hero 之后 / Locations 之前（home-main.tsx）
 *  - 首次挂载 fetch `/api/recommendations/home?seed=<random>` 或不带 seed（服务端生成）
 *  - 「换一批」按钮 → 用返回的 nextSeed 再打一次
 *  - 移动端竖排堆叠 + 「换一批」sticky 底部（本 section 内 sticky，不做全屏）
 *  - 整块三类全空 → 不渲染整个 section（P0-A 空态一致）
 *  - error 态展示手动重试（不静默 return null，spec §7.4 空态 !== error 态）
 *  - seed 只在内存态，不入 cookie / localStorage（spec §5.2 v1.1 隐私）
 *
 * Round 3 §C 过渡动效：
 *  - 点击换一批 → fade-out(150ms) → skeleton → fade-in(200ms)
 *  - 快取门控：fade-out 完成时数据已 ready → 跳过骨架直接 fade-in
 *  - reduced-motion：matchMedia JS gate，跳过相位机直接 fetch+swap（旧硬切行为）
 *  - 失败：旧卡复原（fade-in 200ms 自然淡回 opacity-100）
 *  - skeleton 复用现有 testid，测试断言零改动
 *  - 移动端换一批后 snap 回首张
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
  | { status: "ready"; recommendations: Recommendation[]; nextSeed: string; cityMatch: 'exact' | 'mixed' | 'fallback' | null }
  | { status: "error"; message: string };

type RefreshPhase =
  /** 静止态，ready 卡片正常展示 */
  | "idle"
  /** 旧卡 fade-out 中（150ms），fetch 进行中 */
  | "fadingOut"
  /** fade-out 完成但数据未就绪，显示骨架屏 */
  | "showingSkeleton"
  /** 新卡 fade-in 中（200ms）；失败时也表示旧卡淡回 */
  | "fadingIn";

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

interface HomeRecommendationsSectionProps {
  /** P1 city 个性化 #193 T3: 用户 cityId */
  userCity?: string | null;
  /** userCity 对应的城市名（来自探索地点首个 location.cityName），用于异地明示文案插值 */
  cityName?: string | null;
}

export function HomeRecommendationsSection({ userCity, cityName }: HomeRecommendationsSectionProps) {
  const { t } = useI18n(["home", "enums"]);
  const [state, setState] = React.useState<FetchState>({ status: "loading" });
  const [phase, setPhase] = React.useState<RefreshPhase>("idle");
  const [displayedData, setDisplayedData] = React.useState<Recommendation[] | null>(null);

  // 移动端 scroll container ref（换一批后 snap 回首张）
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // phase === fadingIn 时 snap 回首张
  React.useEffect(() => {
    if (phase === "fadingIn" && scrollRef.current) {
      if (typeof scrollRef.current.scrollTo === "function") {
        scrollRef.current.scrollTo({ left: 0 });
      } else {
        // jsdom / 老浏览器 fallback
        scrollRef.current.scrollLeft = 0;
      }
    }
  }, [phase]);

  const loadInitial = React.useCallback(() => {
    setState({ status: "loading" });
    setPhase("idle");
    setDisplayedData(null);
    let cancelled = false;
    fetchRecommendations()
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "ready",
          recommendations: data.recommendations,
          nextSeed: data.nextSeed,
          cityMatch: data._meta?.cityMatch ?? null,
        });
        setDisplayedData(data.recommendations);
        setPhase("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[HomeRecommendations] fetch failed:", err);
        setState({ status: "error", message: String(err?.message ?? err) });
        setPhase("idle");
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
    if (state.status !== "ready" || phase !== "idle") return;

    const currentSeed = state.nextSeed;

    // §C.3 reduced-motion：瞬时 = 旧硬切，不跑相位机
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const data = await fetchRecommendations(currentSeed).catch((err) => {
        console.error("[HomeRecommendations] refresh failed:", err);
        return null;
      });
      if (data) {
        setState({ status: "ready", recommendations: data.recommendations, nextSeed: data.nextSeed, cityMatch: data._meta?.cityMatch ?? null });
        setDisplayedData(data.recommendations);
      }
      return;
    }

    // --- fade-out 阶段（150ms）---
    setPhase("fadingOut");

    const fetchPromise = fetchRecommendations(currentSeed).catch((err) => {
      console.error("[HomeRecommendations] refresh failed:", err);
      return null;
    });

    // Promise.race：快成功（<150ms）先到 → fastSuccess=true；慢成功/慢失败 → timeout 先到
    const fastSuccess = await Promise.race([
      fetchPromise,
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 150)),
    ]);

    if (fastSuccess) {
      // 快成功（fetch <150ms 返回）：跳过骨架，直接 fade-in
      setState({ status: "ready", recommendations: fastSuccess.recommendations, nextSeed: fastSuccess.nextSeed, cityMatch: fastSuccess._meta?.cityMatch ?? null });
      setDisplayedData(fastSuccess.recommendations);
      setPhase("fadingIn");
      setTimeout(() => setPhase("idle"), 200);
    } else {
      // fade-out 完成时数据未就绪 → 显示骨架，等 fetch 最终结果
      setPhase("showingSkeleton");
      const data = await fetchPromise;
      if (data) {
        // 快取门控（R2）：fade-out 完成时数据已 ready，跳过骨架直接 fade-in
        setState({ status: "ready", recommendations: data.recommendations, nextSeed: data.nextSeed, cityMatch: data._meta?.cityMatch ?? null });
        setDisplayedData(data.recommendations);
        setPhase("fadingIn");
        setTimeout(() => setPhase("idle"), 200);
      } else {
        // fetch 失败 → 旧卡淡回（fadingIn 让容器从 opacity-0 自然淡回 opacity-100）
        setPhase("fadingIn");
        setTimeout(() => setPhase("idle"), 200);
      }
    }
  }, [state, phase]);

  // --- 渲染分支 ---

  // 空态：三类全空 → 不渲染整个 section（spec §7.4）
  if (state.status === "ready" && state.recommendations.length === 0) {
    return null;
  }

  // Error 态
  if (state.status === "error") {
    return (
      <section
        className="bg-secondary/30 py-8 text-center text-sm text-stone-700 dark:text-stone-300"
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
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </section>
    );
  }

  const isLoading = state.status === "loading" || phase !== "idle";
  const showSkeleton = isLoading && (phase === "showingSkeleton" || state.status === "loading");

  // opacity 类：idle=opacity-100 / fadingOut=opacity-0(150ms) / fadingIn=opacity-100(200ms)
  // reduced-motion 由 handleRefresh 入口 JS gate 处理，此处不介入
  const containerClass = [
    "transition-opacity",
    phase === "idle" ? "opacity-100" : "",
    phase === "fadingOut" ? "opacity-0 duration-150 ease-out" : "",
    phase === "fadingIn" ? "opacity-100 duration-200 ease-out" : "",
    phase === "showingSkeleton" ? "opacity-100" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // 骨架屏
  const skeleton = (
    <>
      <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 scrollbar-hide" ref={scrollRef}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[68%] snap-center h-48 rounded-lg border bg-muted animate-pulse"
            data-testid="recommendation-card-skeleton"
          />
        ))}
      </div>
      <div className="hidden md:grid grid-cols-3 gap-4 sm:gap-5" data-testid="recommendation-skeleton-desktop">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-lg border bg-muted animate-pulse"
            data-testid="recommendation-card-skeleton"
          />
        ))}
      </div>
    </>
  );

  // 真实卡片
  const cards = (
    <>
      <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 scrollbar-hide" ref={scrollRef}>
        {(displayedData ?? []).map((reco) => (
          <div key={reco.locationId} className="flex-shrink-0 w-[68%] snap-center">
            <RecommendationCard reco={reco} />
          </div>
        ))}
      </div>
      <div className="hidden md:grid grid-cols-3 gap-4 sm:gap-5" data-testid="recommendation-cards-desktop">
        {(displayedData ?? []).map((reco) => (
          <RecommendationCard key={reco.locationId} reco={reco} />
        ))}
      </div>
    </>
  );

  return (
    <section
      id="recommendations"
      className="bg-secondary/30 py-16 sm:py-20 lg:py-24"
      data-testid="home-recommendations-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="mb-8 max-w-2xl sm:mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">{t("home.recommendations.kind.steady")}</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("home.recommendations.title")}
          </h2>
          {/* Subtitle — spec v1.0 §4: stone-500 neutral, no icon, no bg block (#190/#191 装饰归零) */}
          <p className="mt-3 text-base leading-7 text-stone-700 dark:text-stone-300" data-testid="recommendation-subtitle">
            {t("home.recommendations.subtitle")}
          </p>
        </div>

        {/* Cards / skeleton layer — opacity driven by phase */}
        <div className={containerClass} aria-live="polite" aria-busy={isLoading}>
          {showSkeleton ? skeleton : cards}
        </div>

        {/* P1 city 个性化 #193 T3: cityMatch=mixed 时异地明示（fallback 整块 return null，#216 Option B） */}
        {state.status === "ready" && userCity && state.cityMatch === "mixed" && (
          <div className="mt-4 text-center">
            <p className="text-xs text-stone-500 dark:text-stone-400" data-testid="recommendation-city-hint">
              {t("home.recommendations.cityHint.mixed", { city: cityName ?? "" })}
            </p>
          </div>
        )}

        {/* Refresh CTA — 切换期间隐藏防双击 */}
        {state.status === "ready" && phase === "idle" && (
          <div className="mt-5 sm:mt-6 flex justify-center md:justify-end">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors underline-offset-2 hover:underline"
              data-testid="recommendation-refresh-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
              {t("home.recommendations.cta.refresh")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
