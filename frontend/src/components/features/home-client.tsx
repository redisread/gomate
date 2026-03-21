"use client";

import * as React from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Location, Team } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";

/**
 * 首页客户端组件 - React Island
 */
export function HomeClient() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    totalPages: 0,
    pageSize: 9,
  });

  const fetchLocations = React.useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/locations?page=${page}&pageSize=9`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTeams = React.useCallback(async () => {
    try {
      const res = await fetchAPI("/api/teams?status=recruiting&pageSize=4");
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchLocations(1);
    fetchTeams();
  }, [fetchLocations, fetchTeams]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      window.location.href = `/locations?q=${encodeURIComponent(query.trim())}`;
    } else {
      window.location.href = "/locations";
    }
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-stone-900 overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 to-stone-900/80" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <span className="inline-block mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm text-white/90 text-sm rounded-full border border-white/20">
            {copy.hero.badge}
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {copy.hero.titleLine1}
            <br />
            <span className="text-stone-300">{copy.hero.titleLine2}</span>
          </h1>
          <p className="text-xl text-stone-300 mb-10 max-w-2xl mx-auto">
            {copy.hero.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/locations">
              <button className="px-8 py-3 bg-white text-stone-900 font-semibold rounded-full hover:bg-stone-100 transition-colors">
                {copy.hero.exploreBtn}
              </button>
            </a>
            <a href="/teams">
              <button className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors">
                {copy.hero.findTeamBtn}
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section id="locations" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-stone-900 mb-4">
              {copy.locations.pageTitle}
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              {copy.locations.pageSubtitle}
            </p>
          </div>

          {/* Search */}
          <div className="mb-8 max-w-xl mx-auto">
            <input
              type="text"
              placeholder={copy.common.searchPlaceholder}
              className="w-full px-5 py-3 border border-stone-200 rounded-full focus:outline-none focus:border-stone-400 text-stone-900"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch((e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>

          {/* Locations Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <a key={location.id} href={`/locations/${location.id}`}>
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    <div className="relative h-48 overflow-hidden bg-stone-100">
                      {location.coverImage && (
                        <img
                          src={location.coverImage}
                          alt={location.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-stone-900 mb-1 group-hover:text-stone-700">
                        {location.name}
                      </h3>
                      <p className="text-sm text-stone-500 flex items-center gap-1 mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {location.address || copy.locations.defaultCity}
                      </p>
                      <p className="text-sm text-stone-600 line-clamp-2">
                        {location.description}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page);
                      fetchLocations(page);
                    }}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      page === currentPage
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          )}

          <div className="text-center mt-10">
            <a href="/locations">
              <button className="border border-stone-300 hover:bg-stone-50 text-stone-900 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
                {copy.common.viewAll}
                <ArrowRight className="h-4 w-4" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Teams Section */}
      <section id="teams" className="py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-stone-900 mb-4">
              {copy.teams.pageTitle}
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              {copy.teams.pageSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => (
              <a key={team.id} href={`/teams/${team.id}`}>
                <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-8 w-8 text-stone-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 line-clamp-1">
                        {team.title}
                      </h3>
                      <p className="text-sm text-stone-500 mt-1">
                        {team.date}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-stone-600">
                        <span>{team.currentMembers}/{team.maxMembers}人</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-stone-400 group-hover:text-stone-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="text-center mt-10">
            <a href="/teams">
              <button className="border border-stone-300 hover:bg-white text-stone-900 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
                {copy.common.viewAll}
                <ArrowRight className="h-4 w-4" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-stone-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {copy.hero.titleLine1}，{copy.hero.titleLine2}
          </h2>
          <p className="text-stone-400 text-lg mb-8 max-w-2xl mx-auto">
            {copy.hero.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/teams/create">
              <button className="px-8 py-3 bg-white text-stone-900 font-semibold rounded-full hover:bg-stone-100 transition-colors">
                {copy.hero.createTeamBtn}
              </button>
            </a>
            <a href="#locations">
              <button className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors">
                {copy.hero.exploreBtn}
              </button>
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}
