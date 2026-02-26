"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { LocationHeader } from "@/app/components/features/location-header";
import { LocationInfoCard } from "@/app/components/features/location-info-card";
import { RouteGuide } from "@/app/components/features/route-guide";
import { TeamList } from "@/app/components/features/team-list";
import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { useLocations } from "@/lib/locations-context";

interface Location {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  coverImage: string;
  images: string[];
  difficulty: string;
  duration: string;
  distance: string;
  elevation: string;
  bestSeason: string[];
  tags: string[];
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  routeGuide: {
    overview: string;
    waypoints: { name: string; description: string; distance: string }[];
    tips: string[];
    warnings: string[];
  };
  facilities: {
    parking: boolean;
    restroom: boolean;
    water: boolean;
    food: boolean;
  };
  routeDescription: string;
  waypoints: unknown[];
  warnings: string[];
  tips: string;
}

export default function LocationPage() {
  const params = useParams();
  const id = params.id as string;
  const { locations, isLoading, getLocationById, refreshLocations } = useLocations();

  // Find location using the context method
  const location = getLocationById(id);

  // Simple loading state - if locations array is empty, show loading
  // This will be updated when LocationsProvider fetches data
  const showLoading = isLoading || locations.length === 0;

  if (showLoading) {
    console.log("[LocationPage] showLoading is true, returning spinner");
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">加载中...</div>
      </main>
    );
  }

  if (!location) {
    console.error("[LocationPage] location not found!");
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
