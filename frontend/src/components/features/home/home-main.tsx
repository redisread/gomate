"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useHomeData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeLocationsSection } from "./home-locations-section";
import { HomeHowItWorksSection } from "./home-how-it-works";
import { HomeTeamsSection } from "./home-teams-section";
import { HomeCtaSection } from "./home-cta-section";

export function HomeClient() {
  const data = useHomeData();

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HomeHero data={data} />
      <HomeLocationsSection data={data} />
      <HomeHowItWorksSection sectionRef={data.howItWorksRef} isInView={data.howItWorksInView} />
      <HomeTeamsSection data={data} />
      <HomeCtaSection data={data} />
      <Footer />
    </main>
  );
}
