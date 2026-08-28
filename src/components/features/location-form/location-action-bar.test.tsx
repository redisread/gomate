import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocationActionBar } from "./location-action-bar";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

function renderActionBar(status: "draft" | "published" | "archived") {
  const callbacks = {
    onSave: vi.fn(),
    onPublish: vi.fn(),
    onRestore: vi.fn(),
    onDiscard: vi.fn(),
  };

  render(
    <LocationActionBar
      status={status}
      isDirty
      isSaving={false}
      savingIntent={null}
      {...callbacks}
    />,
  );

  return callbacks;
}

describe("LocationActionBar", () => {
  it("offers separate draft save and publish actions", () => {
    const callbacks = renderActionBar("draft");

    fireEvent.click(screen.getByRole("button", { name: "admin.saveDraft" }));
    fireEvent.click(screen.getByRole("button", { name: "admin.publishLocation" }));

    expect(callbacks.onSave).toHaveBeenCalledOnce();
    expect(callbacks.onPublish).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "admin.restoreToDraft" })).not.toBeInTheDocument();
  });

  it("keeps published locations on the normal save path", () => {
    const callbacks = renderActionBar("published");

    fireEvent.click(screen.getByRole("button", { name: "admin.saveChanges" }));

    expect(callbacks.onSave).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "admin.publishLocation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "admin.restoreToDraft" })).not.toBeInTheDocument();
  });

  it("requires restoring archived locations before publishing", () => {
    const callbacks = renderActionBar("archived");

    fireEvent.click(screen.getByRole("button", { name: "admin.saveChanges" }));
    fireEvent.click(screen.getByRole("button", { name: "admin.restoreToDraft" }));

    expect(callbacks.onSave).toHaveBeenCalledOnce();
    expect(callbacks.onRestore).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "admin.publishLocation" })).not.toBeInTheDocument();
  });

  it("shows discard only when there are unsaved changes", () => {
    const { rerender } = render(
      <LocationActionBar
        status="draft"
        isDirty={false}
        isSaving={false}
        savingIntent={null}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "admin.discardChanges" })).not.toBeInTheDocument();

    rerender(
      <LocationActionBar
        status="draft"
        isDirty
        isSaving={false}
        savingIntent={null}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "admin.discardChanges" })).toBeInTheDocument();
  });

  it("shows progress on the action that initiated the save", () => {
    render(
      <LocationActionBar
        status="draft"
        isDirty
        isSaving
        savingIntent="publish"
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "admin.publishingLocation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "admin.saveDraft" })).toBeDisabled();
  });
});
