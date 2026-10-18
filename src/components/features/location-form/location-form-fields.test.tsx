import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LOCATION_FORM } from "./location-form-data";
import { LocationFormBasicFields } from "./location-form-basic-fields";
import { LocationFormSettingsFields } from "./location-form-settings-fields";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/ui/region-select", () => ({
  RegionSelect: () => <div />,
}));

it("renders static section headings and associates labels with editable fields", () => {
  render(
    <LocationFormBasicFields
      formData={DEFAULT_LOCATION_FORM}
      errors={{ name: "required" }}
      regions={[]}
      activityTypes={[]}
      updateField={vi.fn()}
      touch={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "admin.formBasicTitle", level: 2 }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "admin.formBasicTitle" }),
  ).toBeNull();
  expect(screen.getByLabelText(/admin.formNameRequired/)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText(/admin.formDescriptionRequired/)).toBeVisible();
  expect(screen.getByLabelText("admin.latLabel")).toBeVisible();
  expect(screen.getByText("admin.formRegion")).toHaveTextContent(
    "admin.formRegion*",
  );
});

describe("settings sections", () => {
  it("exposes expanded state for the section and its nested disclosure", () => {
    render(
      <LocationFormSettingsFields
        formData={DEFAULT_LOCATION_FORM}
        allTags={[]}
        updateField={vi.fn()}
      />,
    );
    const settings = screen.getByRole("button", {
      name: /admin.formSettingsTitleRecommended/,
    });
    expect(settings).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(settings);
    expect(settings).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(settings);
    const facilities = screen.getByRole("button", {
      name: "admin.formFacilitiesTitle",
    });
    expect(facilities).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(facilities);
    expect(facilities).toHaveAttribute("aria-expanded", "false");
  });
});
