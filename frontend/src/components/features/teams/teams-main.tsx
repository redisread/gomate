"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useTeams } from "./use-teams";
import {
  TeamsHeader, FilterPanel, TeamsCtaSection,
  TeamCard, TeamSkeleton, EmptyState, Pagination,
} from "./teams-ui";

export function TeamsClient() {
  const ctx = useTeams();

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <TeamsHeader
        searchQuery={ctx.searchQuery}
        showFilters={ctx.showFilters}
        activeFiltersCount={ctx.activeFiltersCount}
        isLoading={ctx.isLoading}
        pagination={ctx.pagination}
        onSearchChange={ctx.setSearchQuery}
        onToggleFilters={() => ctx.setShowFilters(!ctx.showFilters)}
        renderFilterPanel={() => (
          <FilterPanel
            startDate={ctx.startDate}
            endDate={ctx.endDate}
            selectedDifficulty={ctx.selectedDifficulty}
            availableTags={ctx.availableTags}
            selectedTags={ctx.selectedTags}
            activeFiltersCount={ctx.activeFiltersCount}
            onDateQuickSelect={ctx.handleDateQuickSelect}
            onDifficultyToggle={ctx.handleDifficultyToggle}
            onTagToggle={ctx.handleTagToggle}
            onClearAll={ctx.clearFilters}
          />
        )}
      />
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-sm text-stone-400 dark:text-stone-500">
            {ctx.isLoading ? (
              <span className="inline-block w-40 h-4 bg-stone-200 dark:bg-stone-700 rounded-full animate-pulse" />
            ) : ctx.pagination.total > 0 ? (
              <>
                <span className="font-semibold text-stone-700 dark:text-stone-300">{ctx.pagination.total}</span>
                {" "}支队伍向你敞开，随时可以出发
              </>
            ) : null}
          </div>
          {ctx.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <TeamSkeleton key={i} />)}
            </div>
          ) : ctx.teams.length === 0 ? (
            <EmptyState onClear={ctx.clearFilters} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ctx.teams.map((team) => <TeamCard key={team.id} team={team} />)}
            </div>
          )}
          <Pagination current={ctx.currentPage} total={ctx.pagination.totalPages} onChange={ctx.handlePageChange} />
          <TeamsCtaSection />
        </div>
      </section>
      <Footer />
    </main>
  );
}
