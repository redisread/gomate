"use client";

import { X } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useI18n } from "@/hooks/useI18n";
import { useTeams, type TeamsInitialData } from "./use-teams";
import {
  TeamsHeader, FilterPanel, TeamsCtaSection,
  TeamCard, TeamSkeleton, EmptyState, TeamsErrorState, Pagination,
} from "./teams-ui";
import { TeamsSelectedFilters } from "./teams-selected-filters";

export function TeamsClient({ initialData }: { initialData?: TeamsInitialData }) {
  const { t } = useI18n(["teams"]);
  const ctx = useTeams(initialData);
  const regionOnlyEmptyState = Boolean(ctx.selectedRegionName)
    && ctx.activeFiltersCount === 1
    && !ctx.searchQuery;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <TeamsHeader
        searchQuery={ctx.searchQuery}
        showFilters={ctx.showFilters}
        advancedFiltersCount={ctx.advancedFiltersCount}
        onSearchChange={ctx.handleSearchChange}
        onToggleFilters={() => ctx.setShowFilters(!ctx.showFilters)}
        regions={ctx.availableRegions}
        selectedRegionId={ctx.selectedRegionId}
        activeDateQuickType={ctx.activeDateQuickType}
        hasDateFilter={ctx.hasDateFilter}
        regionsLoading={ctx.regionsLoading}
        regionsError={ctx.regionsError}
        onRegionSelect={ctx.handleRegionSelect}
        onDateQuickSelect={ctx.handleDateQuickSelect}
        onRetryRegions={ctx.retryRegions}
        renderFilterPanel={() => (
          <FilterPanel
            selectedActivityType={ctx.selectedActivityType}
            selectedRecruitmentStatus={ctx.selectedRecruitmentStatus}
            availableTags={ctx.availableTags}
            selectedTags={ctx.selectedTags}
            activeFiltersCount={ctx.advancedFiltersCount}
            onActivityTypeSelect={ctx.handleActivityTypeSelect}
            onRecruitmentStatusSelect={ctx.handleRecruitmentStatusSelect}
            onTagToggle={ctx.handleTagToggle}
            onClearAll={ctx.clearAdvancedFilters}
          />
        )}
      />
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              {ctx.isLoading ? (
                <span className="inline-block h-4 w-28 animate-pulse rounded-full bg-stone-200 dark:bg-stone-700" aria-hidden="true" />
              ) : (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {t("teams.resultCount", { count: ctx.pagination.total })}
                </p>
              )}
              {!ctx.isLoading && (
                <TeamsSelectedFilters
                  selectedRegionName={ctx.selectedRegionName ?? (ctx.selectedRegionId ? t("teams.selectedCityFallback") : undefined)}
                  activeDateQuickType={ctx.activeDateQuickType}
                  startDate={ctx.startDate}
                  endDate={ctx.endDate}
                  selectedActivityType={ctx.selectedActivityType}
                  selectedRecruitmentStatus={ctx.selectedRecruitmentStatus}
                  availableTags={ctx.availableTags}
                  selectedTags={ctx.selectedTags}
                  onRegionSelect={ctx.handleRegionSelect}
                  onDateQuickSelect={ctx.handleDateQuickSelect}
                  onActivityTypeSelect={ctx.handleActivityTypeSelect}
                  onRecruitmentStatusSelect={ctx.handleRecruitmentStatusSelect}
                  onTagToggle={ctx.handleTagToggle}
                />
              )}
            </div>
            {(ctx.activeFiltersCount > 0 || ctx.searchQuery) && !ctx.isLoading && (
              <button
                type="button"
                onClick={ctx.clearFilters}
                className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full px-3 text-sm font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96] sm:self-auto"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {t("teams.clearFilters")}
              </button>
            )}
          </div>
          {ctx.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={t("teams.loading")}>
              {Array.from({ length: 6 }).map((_, i) => <TeamSkeleton key={i} />)}
            </div>
          ) : ctx.loadError ? (
            <TeamsErrorState onRetry={ctx.retryCurrentPage} />
          ) : ctx.teams.length === 0 ? (
            <EmptyState
              onClear={ctx.clearFilters}
              onClearRegion={() => ctx.handleRegionSelect("")}
              hasActiveCriteria={ctx.activeFiltersCount > 0 || Boolean(ctx.searchQuery)}
              selectedRegionName={regionOnlyEmptyState ? ctx.selectedRegionName : undefined}
            />
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ctx.teams.map((team) => <TeamCard key={team.id} team={team} />)}
              </ul>
              <TeamsCtaSection />
            </>
          )}
          {!ctx.isLoading && !ctx.loadError && (
            <Pagination current={ctx.currentPage} hasNext={Boolean(ctx.pagination.nextCursor)} onChange={ctx.handlePageChange} />
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
