import { withI18n } from "@/i18n/context";
import { useHomeData, type HomeInitialData } from "./use-home-data";
import { HomeHero } from "./home-hero";
import { HomeMapSection } from "./home-map-section";
import { HomeDepartureBoard } from "./home-departure-board";
import { PreloadImages } from "./preload-images";
import { HomeTimeProvider } from "./home-time";

function HomeClientContent({ initialData, initialTimeZone = "UTC" }: {
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

export const HomeClient = withI18n(HomeClientContent);
