"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Hero } from "@/app/components/features/hero";
import { SearchBar } from "@/app/components/features/search-bar";
import { Filter } from "@/app/components/features/filter";
import { LocationCard } from "@/app/components/features/location-card";
import { Button } from "@/components/ui/button";
import { useLocations } from "@/lib/locations-context";
import { useTeams } from "@/lib/teams-context";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";

export default function HomePage() {
  const { teams } = useTeams();
  const { locations, isLoading } = useLocations();
  const { isAuthenticated } = useAuth();
  console.error("[HomePage] locations count:", locations.length, "isLoading:", isLoading);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedFilters, setSelectedFilters] = React.useState<
    Record<string, string[]>
  >({});

  const handleFilterChange = (groupId: string, optionId: string) => {
    if (groupId === "clear") {
      setSelectedFilters({});
      return;
    }

    setSelectedFilters((prev) => {
      const current = prev[groupId] || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];

      return {
        ...prev,
        [groupId]: updated,
      };
    });
  };

  // Parse duration string and return category
  const getDurationCategory = (duration: string): string => {
    // Extract hours from duration string (e.g., "6-8小时" -> max hours, "2小时" -> hours)
    const match = duration.match(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
    if (!match) return "short";

    const minHours = parseFloat(match[1]);
    const maxHours = match[2] ? parseFloat(match[2]) : minHours;

    // Use max hours to determine category
    if (maxHours <= 4) return "short";      // 半日内 (<= 4 hours)
    if (maxHours <= 10) return "day";       // 一日 (4-10 hours)
    return "multi";                         // 多日 (> 10 hours or contains "天")
  };

  // Get region from address
  const getRegionFromAddress = (address: string): string => {
    if (address.includes("南山区")) return "nanshan";
    if (address.includes("福田区")) return "futian";
    if (address.includes("罗湖区")) return "luohu";
    if (address.includes("大鹏新区")) return "dapeng";
    if (address.includes("坪山区")) return "pingshan";
    return "";
  };

  // Filter locations based on selected filters
  const filteredLocations = React.useMemo(() => {
    return locations.filter((location) => {
      // Filter by difficulty
      if (
        selectedFilters.difficulty?.length > 0 &&
        !selectedFilters.difficulty.includes(location.difficulty)
      ) {
        return false;
      }

      // Filter by duration
      if (selectedFilters.duration?.length > 0) {
        const category = getDurationCategory(location.duration);
        if (!selectedFilters.duration.includes(category)) {
          return false;
        }
      }

      // Filter by region
      if (selectedFilters.region?.length > 0) {
        const region = getRegionFromAddress(location.location.address);
        if (!selectedFilters.region.includes(region)) {
          return false;
        }
      }

      return true;
    });
  }, [selectedFilters, locations]);

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Search & Filter Section */}
      <section id="locations" className="py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
              {copy.locations.pageTitle}
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              {copy.locations.pageSubtitle}
            </p>
          </motion.div>

          {/* Search Bar */}
          <SearchBar
            className="mb-6"
            onFilterClick={() => setIsFilterOpen(true)}
          />

          {/* Filter */}
          <div className="mb-8">
            <Filter
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLocations.map((location, index) => (
              <LocationCard
                key={location.id}
                location={location}
                index={index}
              />
            ))}
          </div>

          {/* View All Button */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-stone-300 hover:bg-stone-50"
              asChild
            >
              <Link href="/locations">
                {copy.common.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Teams Section */}
      <section id="teams" className="py-12 lg:py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
              {copy.teams.pageTitle}
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              {copy.teams.pageSubtitle}
            </p>
          </motion.div>

          {/* Featured Teams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams
              .filter((t) => t.status === "open")
              .slice(0, 4)
              .map((team, index) => {
                const location = locations.find(
                  (l) => l.id === team.locationId
                );
                if (!location) return null;

                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Link href={`/teams/${team.id}`}>
                      <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg transition-all duration-300 group">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <MapPin className="h-8 w-8 text-stone-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-1">
                              {team.title}
                            </h3>
                            <p className="text-sm text-stone-500 mt-1">
                              {location.name} · {team.date}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-sm text-stone-600">
                              <span>{team.currentMembers}/{team.maxMembers}人</span>
                              <span className="text-stone-300">|</span>
                              <span>领队: {team.leader.name}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-stone-400 group-hover:text-stone-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
          </div>

          {/* View All Teams Button */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-stone-300 hover:bg-white"
              asChild
            >
              <Link href="/teams">
                {copy.common.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {copy.hero.titleLine1}，{copy.hero.titleLine2}
            </h2>
            <p className="text-stone-400 text-lg mb-8 max-w-2xl mx-auto">
              {copy.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/teams/create" className="inline-block">
                  <Button
                    size="lg"
                    className="bg-white text-stone-900 hover:bg-stone-100 px-8 w-full sm:w-auto"
                  >
                    {copy.hero.createTeamBtn}
                  </Button>
                </Link>
              ) : (
                <Link href="/login" className="inline-block">
                  <Button
                    size="lg"
                    className="bg-white text-stone-900 hover:bg-stone-100 px-8 w-full sm:w-auto"
                  >
                    {copy.hero.loginRegisterBtn}
                  </Button>
                </Link>
              )}
              <a href="#locations" className="inline-block">
                <Button
                  size="lg"
                  className="bg-white text-stone-900 hover:bg-stone-100 px-8 w-full sm:w-auto"
                >
                  {copy.hero.exploreBtn}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
