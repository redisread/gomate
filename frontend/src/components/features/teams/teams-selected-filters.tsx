import { X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { DIFFICULTY_OPTIONS } from "@/lib/constants";
import { TEAM_DATE_OPTIONS } from "./teams-filter-options";

interface TeamsSelectedFiltersProps {
  selectedCityName?: string;
  activeDateQuickType: string | null;
  startDate: string;
  endDate: string;
  selectedDifficulty: string[];
  availableTags: { id: string; name: string }[];
  selectedTags: string[];
  onCitySelect: (cityId: string) => void;
  onDateQuickSelect: (type: string) => void;
  onDifficultyToggle: (id: string) => void;
  onTagToggle: (tagId: string) => void;
}

export function TeamsSelectedFilters({
  selectedCityName,
  activeDateQuickType,
  startDate,
  endDate,
  selectedDifficulty,
  availableTags,
  selectedTags,
  onCitySelect,
  onDateQuickSelect,
  onDifficultyToggle,
  onTagToggle,
}: TeamsSelectedFiltersProps) {
  const { t } = useI18n(["teams", "filter", "enums"]);
  const dateOption = TEAM_DATE_OPTIONS.find((option) => option.key === activeDateQuickType);
  const dateLabel = dateOption
    ? t(dateOption.labelKey)
    : startDate || endDate
      ? `${t("filter.dateRange")} ${startDate || "…"}–${endDate || "…"}`
      : null;
  const filters = [
    selectedCityName ? { id: "city", label: selectedCityName, ariaLabel: t("teams.removeCityFilter"), remove: () => onCitySelect("") } : null,
    dateLabel ? { id: "date", label: dateLabel, ariaLabel: t("teams.removeDateFilter"), remove: () => onDateQuickSelect("clear") } : null,
    ...selectedDifficulty.map((id) => {
      const option = DIFFICULTY_OPTIONS.find((item) => item.id === id);
      const label = option ? t(option.labelKey) : id;
      return { id: `difficulty-${id}`, label, ariaLabel: t("teams.removeFilter", { name: label }), remove: () => onDifficultyToggle(id) };
    }),
    ...selectedTags.map((id) => {
      const label = availableTags.find((tag) => tag.id === id)?.name ?? id;
      return { id: `tag-${id}`, label, ariaLabel: t("teams.removeFilter", { name: label }), remove: () => onTagToggle(id) };
    }),
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter));

  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("teams.selectedFiltersLabel")}>
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          aria-label={filter.ariaLabel}
          onClick={filter.remove}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 transition-[transform,background-color,color] duration-150 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96] dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/60 dark:hover:bg-amber-950/50"
        >
          {filter.label}
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
