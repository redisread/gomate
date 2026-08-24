import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Location } from "@/lib/types";
import { DEFAULT_LOCATION_FORM } from "./location-form/use-location-form";
import { LocationEditClient, focusLocationFormField } from "./location-edit-client";

const mockUseLocationForm = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("./location-form", () => ({
  useLocationForm: mockUseLocationForm,
  LocationFormBasicFields: () => <div>basic-fields</div>,
  LocationFormContentFields: () => <div>content-fields</div>,
  LocationFormSettingsFields: () => <div>settings-fields</div>,
  LocationActionBar: ({ status, onSave, onPublish, onRestore }: {
    status: string;
    onSave: () => void;
    onPublish: () => void;
    onRestore: () => void;
  }) => (
    <div data-testid="action-bar" data-status={status}>
      <button type="button" onClick={onSave}>save</button>
      <button type="button" onClick={onPublish}>publish</button>
      <button type="button" onClick={onRestore}>restore</button>
    </div>
  ),
}));

const baseLocation: Location = {
  id: "location-1",
  slug: "location-1",
  regionId: "region-1",
  name: "Test location",
  subtitle: null,
  description: "Description",
  address: null,
  latitude: null,
  longitude: null,
  coverImageUrl: null,
  images: [],
  supportedActivityTypes: ["hiking"],
  status: "draft",
  extra: {},
  createdAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
};

function formState(location: Location) {
  return {
    mode: "edit" as const,
    location,
    regions: [],
    allTags: [],
    activityTypes: ["hiking"],
    formData: {
      ...DEFAULT_LOCATION_FORM,
      name: location.name,
      slug: location.slug,
      supportedActivityTypes: location.supportedActivityTypes,
      status: location.status,
      description: location.description,
      regionId: location.regionId,
    },
    errors: {},
    isLoading: false,
    isSaving: false,
    isDirty: false,
    saveMessage: null,
    showDraftBanner: false,
    pendingDraft: null,
    updateField: vi.fn(),
    touch: vi.fn(),
    handleSave: vi.fn().mockResolvedValue({ ok: true }),
    handleDiscard: vi.fn(),
    handleRestoreDraft: vi.fn(),
    handleDiscardDraft: vi.fn(),
  };
}

describe("LocationEditClient publish workflow", () => {
  beforeEach(() => {
    mockUseLocationForm.mockReset();
  });

  it("always returns to the admin list and hides the public link for drafts", () => {
    mockUseLocationForm.mockReturnValue(formState(baseLocation));

    render(<LocationEditClient locationId="location-1" />);

    expect(screen.getByRole("link", { name: "common.back" })).toHaveAttribute("href", "/admin/locations");
    expect(screen.queryByRole("link", { name: "admin.viewPublicLocation" })).not.toBeInTheDocument();
    expect(screen.getByTestId("action-bar")).toHaveAttribute("data-status", "draft");
  });

  it("shows the public link only for the persisted published status", () => {
    mockUseLocationForm.mockReturnValue(formState({ ...baseLocation, status: "published" }));

    render(<LocationEditClient locationId="location-1" />);

    expect(screen.getByRole("link", { name: "admin.viewPublicLocation" })).toHaveAttribute(
      "href",
      "/locations/location-1",
    );
  });

  it("passes explicit workflow intents to the save hook", () => {
    const form = formState(baseLocation);
    mockUseLocationForm.mockReturnValue(form);

    render(<LocationEditClient locationId="location-1" />);
    fireEvent.click(screen.getByRole("button", { name: "publish" }));

    expect(form.handleSave).toHaveBeenCalledWith("publish");
  });

  it("focuses the requested form field", () => {
    const input = document.createElement("input");
    input.id = "location-field-latitude";
    document.body.appendChild(input);

    expect(focusLocationFormField("latitude")).toBe(true);
    expect(input).toHaveFocus();

    input.remove();
  });
});
