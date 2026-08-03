"use client";

import * as React from "react";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeTeamsSection } from "./home-teams-section";
import { HomeLocalCircleSection } from "./local-circle/home-local-circle-section";
import { HomeExploreSection } from "./home-explore-section";
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
        <HomeLocalCircleSection />
        <HomeExploreSection />
        <HomeTeamsSection data={data} />
        {/* P1-1 T2：首次引导流 modal（登录 + 无队伍 + 未看过才弹，gating 全在 hook 内） */}
        <OnboardingModal />
      </main>
    </>
  );
}
