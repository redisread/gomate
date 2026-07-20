"use client";

import { Navbar } from "@/components/layout/navbar";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeLocationsSection } from "./home-locations-section";
import { HomeHowItWorksSection } from "./home-how-it-works";
import { HomeTeamsSection } from "./home-teams-section";
import { HomeCtaSection } from "./home-cta-section";
import { HomeRecommendationsSection } from "./recommendations/home-recommendations-section";
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
        <HomeLocationsSection data={data} />
        <HomeHowItWorksSection sectionRef={data.howItWorksRef} isInView={data.howItWorksInView} />
        <HomeTeamsSection data={data} />
        <HomeCtaSection data={data} />
      </main>
    </>
  );
}
