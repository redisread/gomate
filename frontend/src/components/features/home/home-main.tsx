"use client";

import * as React from "react";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeLocationsSection } from "./home-locations-section";
import { HomeTeamsSection } from "./home-teams-section";
import { HomeLocalCircleSection } from "./local-circle/home-local-circle-section";
import { HomeHowItWorksSection } from "./home-how-it-works-section";
import { OnboardingModal } from "@/components/features/onboarding/onboarding-modal";
import { PreloadImages } from "./preload-images";
import { fetchCurrentUser } from "@/lib/api";

export function HomeClient({ initialData }: { initialData?: HomeInitialData }) {
  const [currentUser, setCurrentUser] = React.useState<Awaited<ReturnType<typeof fetchCurrentUser>> | undefined>(undefined);

  // P0：访客首页强调理解产品，登录首页优先展示可执行的本地行动。
  React.useEffect(() => {
    fetchCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
  }, []);

  const isMember = currentUser !== undefined && Boolean(currentUser);
  const userCity = currentUser?.city ?? null;
  const data = useHomeData(initialData, userCity);

  return (
    <>
      {/* 预加载首屏图片 */}
      <PreloadImages images={data.preloadImages} />
      <main className="min-h-screen bg-background">
        <HomeHero data={data} isMember={isMember} />
        <HomeLocalCircleSection />
        <HomeLocationsSection data={data} showMap={!isMember} />
        {!isMember && currentUser === null && <HomeHowItWorksSection />}
        <HomeTeamsSection data={data} isMember={isMember} />
        {/* P1-1 T2：首次引导流 modal（登录 + 无队伍 + 未看过才弹，gating 全在 hook 内） */}
        <OnboardingModal />
      </main>
    </>
  );
}
