"use client";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeMapSection } from "./home-map-section";
import { HomeDepartureBoard } from "./home-departure-board";
import { PreloadImages } from "./preload-images";

export function HomeClient({ initialData }: { initialData?: HomeInitialData }) {
  const data = useHomeData(initialData);
  return (
    <>
      <PreloadImages images={data.preloadImages} />
      <main className="min-h-screen bg-background">
        <HomeHero data={data} />
        <HomeDepartureBoard teams={data.teams} />
        <HomeMapSection />
      </main>
    </>
  );
}
