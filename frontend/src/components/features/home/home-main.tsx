"use client";

import { Navbar } from "@/components/layout/navbar";
import { useHomeData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeLocationsSection } from "./home-locations-section";
import { HomeHowItWorksSection } from "./home-how-it-works";
import { HomeTeamsSection } from "./home-teams-section";
import { HomeCtaSection } from "./home-cta-section";
import { useI18n } from "@/hooks/useI18n";
import { HomeSkeleton } from "@/components/ui/skeleton";

export function HomeClient() {
  const data = useHomeData();
  const { loading: i18nLoading } = useI18n(["home", "locations", "teams", "content"]);

  // i18n 加载中时显示骨架屏
  if (i18nLoading) {
    return <HomeSkeleton />;
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HomeHero data={data} />
      <HomeLocationsSection data={data} />
      <HomeHowItWorksSection sectionRef={data.howItWorksRef} isInView={data.howItWorksInView} />
      <HomeTeamsSection data={data} />
      <HomeCtaSection data={data} />
    </main>
  );
}
