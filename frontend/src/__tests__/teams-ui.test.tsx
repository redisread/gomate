import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Team } from "@/lib/types";
import {
  EmptyState,
  FilterPanel,
  TeamCard,
  TeamsHeader,
  TeamsCtaSection,
} from "../components/features/teams/teams-ui";

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
    const { rerender } = render(<EmptyState onClear={vi.fn()} hasActiveCriteria={false} />);

    expect(screen.queryByRole("button", { name: "teams.clearFilters" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "teams.createBtn" })).toHaveAttribute("href", "/teams/create");

    rerender(<EmptyState onClear={vi.fn()} hasActiveCriteria />);
    expect(screen.getByRole("button", { name: "teams.clearFilters" })).toBeInTheDocument();
  });

  it("exposes search and filter state to keyboard and assistive technology users", () => {
    const onToggleFilters = vi.fn();
    render(
      <TeamsHeader
        searchQuery=""
        showFilters={false}
        activeFiltersCount={1}
        onSearchChange={vi.fn()}
        onToggleFilters={onToggleFilters}
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
          startDate=""
          endDate=""
          selectedDifficulty={[]}
          availableTags={[{ id: "tag-1", name: "日出" }]}
          selectedTags={[]}
          activeFiltersCount={0}
          activeDateQuickType={null}
          onDateQuickSelect={vi.fn()}
          onDifficultyToggle={vi.fn()}
          onTagToggle={vi.fn()}
          onClearAll={vi.fn()}
        />
        <TeamsCtaSection />
      </>,
    );

    expect(screen.getByRole("button", { name: "filter.dateQuickToday" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "filter.dateQuickTomorrow" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: "teams.createBtn" })).toHaveAttribute("href", "/teams/create");
    expect(screen.queryByRole("button", { name: "teams.createBtn" })).not.toBeInTheDocument();
  });
});
