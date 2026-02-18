import { locations } from "@/lib/data/mock";
import { notFound } from "next/navigation";
import { LocationHeader } from "@/app/components/features/location-header";
import { LocationInfoCard } from "@/app/components/features/location-info-card";
import { RouteGuide } from "@/app/components/features/route-guide";
import { TeamList } from "@/app/components/features/team-list";
import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";

interface LocationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { id } = await params;
  const location = locations.find((l) => l.id === id);

  if (!location) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />
      <LocationHeader location={location} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h2 className="text-xl font-semibold text-stone-900 mb-4">地点介绍</h2>
              <p className="text-stone-600 leading-relaxed">{location.description}</p>
            </div>
            <RouteGuide location={location} />
            <div id="teams">
              <TeamList locationId={id} />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <LocationInfoCard location={location} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
