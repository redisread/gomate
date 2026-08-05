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
      : ctx.selectedCityId && ctx.locations.length === 0 && !ctx.searchQuery
      ? "noCity"
      : !ctx.userCity && !ctx.selectedCityId && !ctx.hasActiveFilters && ctx.locations.length === 0
      ? "noCitySet"
      : "tooNarrow";

  // 点击外部关闭城市下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const btn = document.querySelector("[data-city-btn]") as Node | null;
      const dropdown = document.querySelector("[data-city-dropdown]") as Node | null;
      if (!btn?.contains(target) && !dropdown?.contains(target)) {
        ctx.setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.setShowCityDropdown]);

  // Sync page to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (ctx.currentPage > 1) {
      params.set("page", ctx.currentPage.toString());
    } else {
      params.delete("page");
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [ctx.currentPage]);

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Navbar />
      <LocationsHero
        activeRole={ctx.activeRole}
        searchQuery={ctx.searchQuery}
        selectedCityId={ctx.selectedCityId}
        selectedTags={ctx.selectedTags}
        cities={ctx.cities}
        popularTags={ctx.popularTags}
        showCityDropdown={ctx.showCityDropdown}
        cityDropdownPos={ctx.cityDropdownPos}
        selectedCityName={ctx.selectedCityName}
        hasActiveFilters={ctx.hasActiveFilters}
        isLoading={ctx.isLoading}
        pagination={ctx.pagination}
        onRoleSelect={ctx.handleRoleSelect}
        onSearchChange={ctx.setSearchQuery}
        onTagToggle={ctx.handleTagToggle}
        onCitySelect={ctx.handleCitySelect}
        onClearAll={ctx.handleClearAll}
        onToggleCityDropdown={() => ctx.setShowCityDropdown(!ctx.showCityDropdown)}
        setCityDropdownPos={ctx.setCityDropdownPos}
      />
      <section className="py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LocationsResultBar
            isLoading={ctx.isLoading}
            pagination={ctx.pagination}
            selectedCityId={ctx.selectedCityId}
            selectedTags={ctx.selectedTags}
            activeRole={ctx.activeRole}
            selectedCityName={ctx.selectedCityName}
            popularTags={ctx.popularTags}
            hasActiveFilters={ctx.hasActiveFilters}
            onRoleSelect={ctx.handleRoleSelect}
            onCitySelect={ctx.handleCitySelect}
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
            getPageNumbers={ctx.getPageNumbers}
          />
        </div>
      </section>
      <Footer />
    </main>
  );
}
