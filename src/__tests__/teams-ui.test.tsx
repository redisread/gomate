import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Region, Team } from "@/lib/types";
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
    locationId: "location-1",
    leaderId: "leader-1",
    activityType: "hiking",
    title: "梧桐山日出",
    description: null,
    startAt: "2026-08-08T05:00:00.000Z",
    endAt: "2026-08-08T09:00:00.000Z",
    maxParticipants: 8,
    activeParticipantCount: 2,
    requirements: [],
    recruitmentStatus: "open",
    formedAt: null,
    cancelledAt: null,
    lifecycle: "pending",
    isFull: false,
    checklist: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    location: {
      id: "location-1",
      regionId: "sz",
      name: "梧桐山",
      slug: "wutongshan",
      supportedActivityTypes: ["hiking"],
      status: "published",
      subtitle: null,
      description: "",
      address: null,
      latitude: 22.58,
      longitude: 114.21,
      coverImageUrl: "https://example.com/wutong.jpg",
      images: [],
      extra: { hiking: { difficulty: "moderate" } },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

function selectableRegion(id: string, name: string, isHot: boolean): Region {
  return {
    id,
    countryCode: "CN",
    parentId: null,
    name,
    nameEn: null,
    slug: id,
    code: null,
    level: "city",
    timezone: "Asia/Shanghai",
    centerLatitude: null,
    centerLongitude: null,
    serviceEnabled: true,
    isHot,
    sortOrder: 0,
  };
}

describe("teams list UI", () => {
  it("uses the card itself as the detail action without a duplicate detail label", () => {
    render(<TeamCard team={makeTeam()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/teams/team-1");
    expect(screen.queryByText("teams.viewDetailShort")).not.toBeInTheDocument();
    expect(screen.getByText("梧桐山日出")).toBeInTheDocument();
  });

  it("only shows clear filters when the empty result is caused by criteria", () => {
    const { rerender } = render(<EmptyState onClear={vi.fn()} onClearRegion={vi.fn()} hasActiveCriteria={false} />);

    expect(screen.queryByRole("button", { name: "teams.clearFilters" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "teams.createBtn" })).toHaveAttribute("href", "/teams/create");

    rerender(<EmptyState onClear={vi.fn()} onClearRegion={vi.fn()} hasActiveCriteria />);
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
        regions={[]}
        selectedRegionId=""
        activeDateQuickType={null}
        hasDateFilter={false}
        regionsLoading={false}
        regionsError={false}
        onRegionSelect={vi.fn()}
        onDateQuickSelect={vi.fn()}
        onRetryRegions={vi.fn()}
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
          selectedActivityType=""
          selectedRecruitmentStatus="open"
          availableActivityTypes={[
            { id: "hiking", name: "徒步", slug: "hiking", isActive: true, sortOrder: 10 },
          ]}
          availableTags={[{ id: "tag-1", name: "日出" }]}
          selectedTags={[]}
          activeFiltersCount={0}
          onActivityTypeSelect={vi.fn()}
          onRecruitmentStatusSelect={vi.fn()}
          onTagToggle={vi.fn()}
          onClearAll={vi.fn()}
        />
        <TeamsCtaSection />
      </>,
    );

    expect(screen.getByRole("button", { name: "徒步" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: "teams.createBtn" })).toHaveAttribute("href", "/teams/create");
    expect(screen.queryByRole("button", { name: "teams.createBtn" })).not.toBeInTheDocument();
  });

  it("keeps popular regions and departure time available as one-tap filters", () => {
    const onRegionSelect = vi.fn();
    const onDateQuickSelect = vi.fn();

    render(
      <TeamsQuickFilters
        regions={[
          selectableRegion("sz", "深圳", true),
          selectableRegion("gz", "广州", true),
          selectableRegion("hz", "惠州", false),
        ]}
        selectedRegionId="sz"
        activeDateQuickType="weekend"
        hasDateFilter
        regionsLoading={false}
        regionsError={false}
        onRegionSelect={onRegionSelect}
        onDateQuickSelect={onDateQuickSelect}
        onRetryRegions={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "filter.city" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "filter.dateRange" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "深圳" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "filter.dateQuickWeekend" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "广州" }));
    fireEvent.click(screen.getByRole("button", { name: "filter.dateQuickTomorrow" }));

    expect(onRegionSelect).toHaveBeenCalledWith("gz");
    expect(onDateQuickSelect).toHaveBeenCalledWith("tomorrow");

    fireEvent.click(screen.getByRole("button", { name: "teams.moreCities" }));
    const regionSearch = screen.getByRole("searchbox", { name: "teams.citySearchPlaceholder" });
    fireEvent.change(regionSearch, { target: { value: "惠州" } });
    fireEvent.click(screen.getByRole("option", { name: /惠州/ }));

    expect(onRegionSelect).toHaveBeenCalledWith("hz");

    fireEvent.click(screen.getByRole("button", { name: "teams.moreCities" }));
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "teams.citySearchPlaceholder" }), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "teams.citySearchPlaceholder" }), { key: "Enter" });
    expect(onRegionSelect).toHaveBeenCalledWith("sz");
  });

  it("shows selected region and date as independently removable filters", () => {
    const onRegionSelect = vi.fn();
    const onDateQuickSelect = vi.fn();

    render(
      <TeamsSelectedFilters
        selectedRegionName="深圳"
        activeDateQuickType="weekend"
        startDate="2026-08-08"
        endDate="2026-08-09"
        selectedActivityType=""
        availableActivityTypes={[]}
        selectedRecruitmentStatus="open"
        availableTags={[]}
        selectedTags={[]}
        onRegionSelect={onRegionSelect}
        onDateQuickSelect={onDateQuickSelect}
        onActivityTypeSelect={vi.fn()}
        onRecruitmentStatusSelect={vi.fn()}
        onTagToggle={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "teams.removeCityFilter" }));
    fireEvent.click(screen.getByRole("button", { name: "teams.removeDateFilter" }));

    expect(onRegionSelect).toHaveBeenCalledWith("");
    expect(onDateQuickSelect).toHaveBeenCalledWith("clear");
  });

  it("keeps custom date ranges visible and removable", () => {
    const onDateQuickSelect = vi.fn();

    render(
      <TeamsSelectedFilters
        activeDateQuickType={null}
        startDate="2026-08-08"
        endDate="2026-08-10"
        selectedActivityType=""
        availableActivityTypes={[]}
        selectedRecruitmentStatus="open"
        availableTags={[]}
        selectedTags={[]}
        onRegionSelect={vi.fn()}
        onDateQuickSelect={onDateQuickSelect}
        onActivityTypeSelect={vi.fn()}
        onRecruitmentStatusSelect={vi.fn()}
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
