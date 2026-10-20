import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FilterPanel } from "./teams-ui";

vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

it("exposes tag failure with an accessible retry action", () => {
  const retry = vi.fn();
  render(<FilterPanel selectedActivityType="" selectedRecruitmentStatus="open" availableActivityTypes={[]} availableTags={[]} selectedTags={[]} activeFiltersCount={0} tagsError onRetryTags={retry} onActivityTypeSelect={vi.fn()} onRecruitmentStatusSelect={vi.fn()} onTagToggle={vi.fn()} onClearAll={vi.fn()} />);
  expect(screen.getByRole("alert").textContent).toContain("teams.tagsLoadFailed");
  fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
  expect(retry).toHaveBeenCalledOnce();
});
