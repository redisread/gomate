"use client";

import { Navbar } from "@/components/layout/navbar";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeLocationsSection } from "./home-locations-section";
import { HomeTeamsSection } from "./home-teams-section";
import { HomeRecommendationsSection } from "./recommendations/home-recommendations-section";
import { HomeLocalCircleSection } from "./local-circle/home-local-circle-section";
import { OnboardingModal } from "@/components/features/onboarding/onboarding-modal";
import { PreloadImages } from "./preload-images";

export function HomeClient({ initialData }: { initialData?: HomeInitialData }) {
  const data = useHomeData(initialData);

  return (
    <>
      {/* 预加载首屏图片 */}
      <PreloadImages images={data.preloadImages} />
      <main className="min-h-screen bg-background">
        <Navbar />
        <HomeHero data={data} />
        {/* P0-C T2：本周三个选择（Hero 之后 / Locations 之前） */}
        <HomeRecommendationsSection />
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
