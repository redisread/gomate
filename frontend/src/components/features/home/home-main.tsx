"use client";

import * as React from "react";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeLocationsSection } from "./home-locations-section";
import { HomeTeamsSection } from "./home-teams-section";
import { HomeRecommendationsSection } from "./recommendations/home-recommendations-section";
import { HomeLocalCircleSection } from "./local-circle/home-local-circle-section";
import { ChinaMap } from "./china-map";
import { OnboardingModal } from "@/components/features/onboarding/onboarding-modal";
import { PreloadImages } from "./preload-images";
import { fetchCurrentUser } from "@/lib/api";

export function HomeClient({ initialData }: { initialData?: HomeInitialData }) {
  const [userCity, setUserCity] = React.useState<string | null | undefined>(undefined);

  // P1 city 个性化 #193 T3: 获取用户 city，用于探索地点城市筛选
  React.useEffect(() => {
    fetchCurrentUser()
      .then((user) => setUserCity(user?.city ?? null))
      .catch(() => setUserCity(null));
  }, []);

  const data = useHomeData(initialData, userCity);

  return (
    <>
      {/* 预加载首屏图片 */}
      <PreloadImages images={data.preloadImages} />
        <main className="min-h-screen bg-background">
        <HomeHero data={data} />
        {/* P0-C T2：本周三个选择（Hero 之后 / Locations 之前） */}
        <HomeRecommendationsSection userCity={data.userCity} cityName={data.locations.length > 0 ? data.locations[0].cityName : null} />

        {/* 中国地图：省维度地点分布（仿 livabble WorldMap） */}
        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <ChinaMap />
        </section>

        {/* P0-D T2：首页本地圈子模块（推荐位之后 / Locations 之前） */}
        <HomeLocalCircleSection />
        <HomeLocationsSection data={data} />
        <HomeTeamsSection data={data} />
        {/* P1-1 T2：首次引导流 modal（登录 + 无队伍 + 未看过才弹，gating 全在 hook 内） */}
        <OnboardingModal />
      </main>
    </>
  );
}
