import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useLocationsList, type LocationsListInitialData } from "./use-locations-list";
import { LocationsHero, LocationsResultBar } from "./locations-hero";
import { LocationsGrid, type EmptyStateVariant } from "./locations-grid";

export function LocationsClient({ initialData }: { initialData?: LocationsListInitialData }) {
  const ctx = useLocationsList(initialData);
  const emptyVariant: EmptyStateVariant = ctx.searchQuery ? "noSearch" : ctx.selectedTags.length > 0 ? "tooNarrow" : ctx.selectedRegionId ? "noRegion" : "tooNarrow";

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <LocationsHero
        activeRole={ctx.activeRole}
        searchQuery={ctx.searchQuery}
        selectedRegionId={ctx.selectedRegionId}
        selectedTags={ctx.selectedTags}
        regions={ctx.regions}
        popularTags={ctx.popularTags}
        showRegionDropdown={ctx.showRegionDropdown}
        onRoleSelect={ctx.handleRoleSelect}
        onSearchChange={ctx.setSearchQuery}
        onTagToggle={ctx.handleTagToggle}
        onRegionSelect={ctx.handleRegionSelect}
        onClearFilters={ctx.handleClearFilters}
        onRegionDropdownChange={ctx.setShowRegionDropdown}
      />
      <section className="py-6 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <LocationsResultBar isLoading={ctx.isLoading} isRefreshing={ctx.isRefreshing} pagination={ctx.pagination} hasLoadError={ctx.hasLoadError} onRetry={ctx.handleRetry} />
          <LocationsGrid
            locations={ctx.locations}
            isLoading={ctx.isLoading}
            isRefreshing={ctx.isRefreshing}
            pagination={ctx.pagination}
            hasLoadError={ctx.hasLoadError}
            onClearSearch={ctx.onClearSearch}
            onClearTags={ctx.handleClearTags}
            onChangeRegion={ctx.onChangeRegion}
            hasSelectedTags={ctx.selectedTags.length > 0}
            onNavigate={ctx.saveBrowsePosition}
            regionName={ctx.selectedRegionName}
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
