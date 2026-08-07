"use client";

import * as React from "react";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeLocalCircleSection } from "./local-circle/home-local-circle-section";
import { HomeHowItWorksSection } from "./home-how-it-works-section";
import { HomeMapSection } from "./home-map-section";
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

  const userCity = currentUser?.city ?? null;
  const data = useHomeData(initialData, userCity);

  if (currentUser === undefined) {
    return (
      <main className="min-h-screen bg-background" data-testid="home-auth-loading" aria-busy="true">
        <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="space-y-5 pt-8">
            <div className="h-8 w-44 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
            <div className="h-36 max-w-xl animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
            <div className="h-20 max-w-lg animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          </div>
          <div className="h-[30rem] animate-pulse rounded-[2rem] bg-muted motion-reduce:animate-none" />
        </section>
      </main>
    );
  }

  const isMember = Boolean(currentUser);

  return (
    <>
      {/* 预加载首屏图片 */}
      <PreloadImages images={data.preloadImages} />
      <main className="min-h-screen bg-background">
        <div data-testid={isMember ? "member-home" : "guest-home"}>
          <HomeHero data={data} isMember={isMember} />
        </div>
        <HomeLocalCircleSection />
        <HomeMapSection />
        {!isMember && currentUser === null && <HomeHowItWorksSection />}
        {/* P1-1 T2：首次引导流 modal（登录 + 无队伍 + 未看过才弹，gating 全在 hook 内） */}
        <OnboardingModal />
      </main>
    </>
  );
}
