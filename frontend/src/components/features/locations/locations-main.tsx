import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useI18n } from "@/hooks/useI18n";
import { useLocationsList, type LocationsListInitialData } from "./use-locations-list";
import { LocationsHero, LocationsResultBar } from "./locations-hero";
import { LocationsGrid, type EmptyStateVariant } from "./locations-grid";

export function LocationsClient({ initialData }: { initialData?: LocationsListInitialData }) {
  const ctx = useLocationsList(initialData);
  const { loading: _i18nLoading } = useI18n(["locations", "filter"]);

  const emptyVariant: EmptyStateVariant =
    ctx.searchQuery.length > 0
      ? "noSearch"
      : ctx.selectedRegionId && ctx.locations.length === 0 && !ctx.searchQuery
      ? "noRegion"
      : !ctx.userRegionId && !ctx.selectedRegionId && !ctx.hasActiveFilters && ctx.locations.length === 0
      ? "noRegionSet"
      : "tooNarrow";

  // Close the Region menu when focus moves outside it.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const btn = document.querySelector("[data-region-btn]") as Node | null;
      const dropdown = document.querySelector("[data-region-dropdown]") as Node | null;
      if (!btn?.contains(target) && !dropdown?.contains(target)) {
        ctx.setShowRegionDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.setShowRegionDropdown]);

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Navbar />
      <LocationsHero
        activeRole={ctx.activeRole}
        searchQuery={ctx.searchQuery}
        selectedRegionId={ctx.selectedRegionId}
        selectedTags={ctx.selectedTags}
        regions={ctx.regions}
        popularTags={ctx.popularTags}
        showRegionDropdown={ctx.showRegionDropdown}
        regionDropdownPos={ctx.regionDropdownPos}
        selectedRegionName={ctx.selectedRegionName}
        hasActiveFilters={ctx.hasActiveFilters}
        isLoading={ctx.isLoading}
        pagination={ctx.pagination}
        onRoleSelect={ctx.handleRoleSelect}
        onSearchChange={ctx.setSearchQuery}
        onTagToggle={ctx.handleTagToggle}
        onRegionSelect={ctx.handleRegionSelect}
        onClearAll={ctx.handleClearAll}
        onToggleRegionDropdown={() => ctx.setShowRegionDropdown(!ctx.showRegionDropdown)}
        setRegionDropdownPos={ctx.setRegionDropdownPos}
      />
      <section className="py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LocationsResultBar
            isLoading={ctx.isLoading}
            pagination={ctx.pagination}
            selectedRegionId={ctx.selectedRegionId}
            selectedTags={ctx.selectedTags}
            activeRole={ctx.activeRole}
            selectedRegionName={ctx.selectedRegionName}
            popularTags={ctx.popularTags}
            hasActiveFilters={ctx.hasActiveFilters}
            onRoleSelect={ctx.handleRoleSelect}
            onRegionSelect={ctx.handleRegionSelect}
            onTagToggle={ctx.handleTagToggle}
            onClearAll={ctx.handleClearAll}
          />
          <LocationsGrid
            locations={ctx.locations}
            isLoading={ctx.isLoading}
            isRefreshing={ctx.isRefreshing}
            pagination={ctx.pagination}
            onClear={ctx.handleClearAll}
            emptyVariant={emptyVariant}
            query={ctx.searchQuery}
            currentPage={ctx.currentPage}
            onPageChange={ctx.handlePageChange}
          />
        </div>
      </section>
      <Footer />
    </main>
  );
}
