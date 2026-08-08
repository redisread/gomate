import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Team } from "@/lib/types";
import {
  EmptyState,
  FilterPanel,
  TeamCard,
  TeamsHeader,
  TeamsErrorState,
  TeamsCtaSection,
} from "../components/features/teams/teams-ui";
import {
  TeamsQuickFilters,
} from "../components/features/teams/teams-quick-filters";
import { TeamsSelectedFilters } from "../components/features/teams/teams-selected-filters";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (!vars) return key;
      return Object.entries(vars).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, String(value)),
        key,
      );
    },
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-1",
    title: "梧桐山日出",
    date: "2026-08-08",
    time: "05:00",
    status: "recruiting",
    maxMembers: 8,
    currentMembers: 2,
    locationId: "location-1",
    location: {
      name: "梧桐山",
      difficulty: "moderate",
      coverImage: "https://example.com/wutong.jpg",
    },
    ...overrides,
  } as Team;
}

describe("teams list UI", () => {
  it("uses the card itself as the detail action without a duplicate detail label", () => {
    render(<TeamCard team={makeTeam()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/teams/team-1");
    expect(screen.queryByText("teams.viewDetailShort")).not.toBeInTheDocument();
    expect(screen.getByText("梧桐山日出")).toBeInTheDocument();
  });

  it("only shows clear filters when the empty result is caused by criteria", () => {
    const { rerender } = render(<EmptyState onClear={vi.fn()} onClearCity={vi.fn()} hasActiveCriteria={false} />);

    expect(screen.queryByRole("button", { name: "teams.clearFilters" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "teams.createBtn" })).toHaveAttribute("href", "/teams/create");

    rerender(<EmptyState onClear={vi.fn()} onClearCity={vi.fn()} hasActiveCriteria />);
    expect(screen.getByRole("button", { name: "teams.clearFilters" })).toBeInTheDocument();
  });

  it("exposes search and filter state to keyboard and assistive technology users", () => {
    const onToggleFilters = vi.fn();
    render(
      <TeamsHeader
        searchQuery=""
        showFilters={false}
        advancedFiltersCount={1}
        onSearchChange={vi.fn()}
        onToggleFilters={onToggleFilters}
        cities={[]}
        selectedCityId=""
        activeDateQuickType={null}
        hasDateFilter={false}
        citiesLoading={false}
        citiesError={false}
        onCitySelect={vi.fn()}
        onDateQuickSelect={vi.fn()}
        onRetryCities={vi.fn()}
        renderFilterPanel={() => <div data-testid="filter-panel" />}
      />,
    );

    const search = screen.getByRole("searchbox");
    const filterButton = screen.getByRole("button", { name: "filter.title" });
    expect(search).toHaveAttribute("type", "search");
    expect(filterButton).toHaveAttribute("aria-controls", "team-filter-panel");
    expect(filterButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(filterButton);
    expect(onToggleFilters).toHaveBeenCalledOnce();
  });

  it("marks filter chips as pressed and keeps the create CTA as a real link", () => {
    render(
      <>
        <FilterPanel
          selectedDifficulty={[]}
          availableTags={[{ id: "tag-1", name: "日出" }]}
          selectedTags={[]}
          activeFiltersCount={0}
          onDifficultyToggle={vi.fn()}
          onTagToggle={vi.fn()}
          onClearAll={vi.fn()}
        />
        <TeamsCtaSection />
      </>,
    );

    expect(screen.getByRole("button", { name: "enums.difficulty.easy" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: "teams.createBtn" })).toHaveAttribute("href", "/teams/create");
    expect(screen.queryByRole("button", { name: "teams.createBtn" })).not.toBeInTheDocument();
  });

  it("keeps popular cities and departure time available as one-tap filters", () => {
    const onCitySelect = vi.fn();
    const onDateQuickSelect = vi.fn();

    render(
      <TeamsQuickFilters
        cities={[
          { id: "sz", adcode: "440300", name: "深圳", level: "city", isHot: true },
          { id: "gz", adcode: "440100", name: "广州", level: "city", isHot: true },
          { id: "hz", adcode: "441300", name: "惠州", level: "city", isHot: false },
        ]}
        selectedCityId="sz"
        activeDateQuickType="weekend"
        hasDateFilter
        citiesLoading={false}
        citiesError={false}
        onCitySelect={onCitySelect}
        onDateQuickSelect={onDateQuickSelect}
        onRetryCities={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "filter.city" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "filter.dateRange" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "深圳" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "filter.dateQuickWeekend" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "广州" }));
    fireEvent.click(screen.getByRole("button", { name: "filter.dateQuickTomorrow" }));

    expect(onCitySelect).toHaveBeenCalledWith("gz");
    expect(onDateQuickSelect).toHaveBeenCalledWith("tomorrow");

    fireEvent.click(screen.getByRole("button", { name: "teams.moreCities" }));
    const citySearch = screen.getByRole("searchbox", { name: "teams.citySearchPlaceholder" });
    fireEvent.change(citySearch, { target: { value: "惠州" } });
    fireEvent.click(screen.getByRole("option", { name: /惠州/ }));

    expect(onCitySelect).toHaveBeenCalledWith("hz");

    fireEvent.click(screen.getByRole("button", { name: "teams.moreCities" }));
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "teams.citySearchPlaceholder" }), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "teams.citySearchPlaceholder" }), { key: "Enter" });
    expect(onCitySelect).toHaveBeenCalledWith("sz");
  });

  it("shows selected city and date as independently removable filters", () => {
    const onCitySelect = vi.fn();
    const onDateQuickSelect = vi.fn();

    render(
      <TeamsSelectedFilters
        selectedCityName="深圳"
        activeDateQuickType="weekend"
        startDate="2026-08-08"
        endDate="2026-08-09"
        selectedDifficulty={[]}
        availableTags={[]}
        selectedTags={[]}
        onCitySelect={onCitySelect}
        onDateQuickSelect={onDateQuickSelect}
        onDifficultyToggle={vi.fn()}
        onTagToggle={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "teams.removeCityFilter" }));
    fireEvent.click(screen.getByRole("button", { name: "teams.removeDateFilter" }));

    expect(onCitySelect).toHaveBeenCalledWith("");
    expect(onDateQuickSelect).toHaveBeenCalledWith("clear");
  });

  it("keeps custom date ranges visible and removable", () => {
    const onDateQuickSelect = vi.fn();

    render(
      <TeamsSelectedFilters
        activeDateQuickType={null}
        startDate="2026-08-08"
        endDate="2026-08-10"
        selectedDifficulty={[]}
        availableTags={[]}
        selectedTags={[]}
        onCitySelect={vi.fn()}
        onDateQuickSelect={onDateQuickSelect}
        onDifficultyToggle={vi.fn()}
        onTagToggle={vi.fn()}
      />,
    );

    expect(screen.getByText("filter.dateRange 2026-08-08–2026-08-10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "teams.removeDateFilter" }));
    expect(onDateQuickSelect).toHaveBeenCalledWith("clear");
  });

  it("offers a retry action when team loading fails", () => {
    const onRetry = vi.fn();
    render(<TeamsErrorState onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "teams.retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
