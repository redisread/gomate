"use client";

import { Navbar } from "@/components/layout/navbar";
import { useHomeData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeLocationsSection } from "./home-locations-section";
import { HomeHowItWorksSection } from "./home-how-it-works";
import { HomeTeamsSection } from "./home-teams-section";
import { HomeCtaSection } from "./home-cta-section";
import { PreloadImages } from "./preload-images";

export function HomeClient() {
  const data = useHomeData();

  return (
    <>
      {/* 预加载首屏图片 */}
      <PreloadImages images={data.preloadImages} />
      <main className="min-h-screen bg-background">
        <Navbar />
        <HomeHero data={data} />
        <HomeLocationsSection data={data} />
        <HomeHowItWorksSection sectionRef={data.howItWorksRef} isInView={data.howItWorksInView} />
        <HomeTeamsSection data={data} />
        <HomeCtaSection data={data} />
      </main>
    </>
  );
}
