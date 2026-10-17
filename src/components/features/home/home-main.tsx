"use client";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeMapSection } from "./home-map-section";
import { HomeDepartureBoard } from "./home-departure-board";
import { PreloadImages } from "./preload-images";
import { HomeTimeProvider } from "./home-time";

export function HomeClient({ initialData, initialTimeZone = "UTC" }: {
  initialData?: HomeInitialData;
  initialTimeZone?: string;
}) {
  const data = useHomeData(initialData);
  return (
    <HomeTimeProvider initialTimeZone={initialTimeZone}>
      <PreloadImages images={data.preloadImages} />
      <main className="min-h-screen bg-background">
        <HomeHero data={data} />
        <HomeDepartureBoard teams={data.teams} />
        <HomeMapSection />
      </main>
    </HomeTimeProvider>
  );
}
