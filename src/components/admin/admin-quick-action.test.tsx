import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminQuickAction } from "./admin-quick-action";

function QuickActionFixture({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void;
}) {
  const initialFocusRef = React.useRef<HTMLInputElement>(null);
  return (
    <AdminQuickAction
      label="Quick add location"
      title="Quickly record a location"
      closeLabel="Close quick entry"
      initialFocusRef={initialFocusRef}
      onOpenChange={onOpenChange}
    >
      <label>
        Location
        <input ref={initialFocusRef} />
      </label>
      <button type="button">Save draft</button>
    </AdminQuickAction>
  );
}

describe("AdminQuickAction", () => {
  let offsetParentDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    offsetParentDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetParent",
    );
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return this.parentElement;
      },
    });
  });

  afterEach(() => {
    if (offsetParentDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetParent",
        offsetParentDescriptor,
      );
    } else {
      delete (HTMLElement.prototype as { offsetParent?: Element | null })
        .offsetParent;
    }
    document.body.style.overflow = "";
  });

  it("opens an accessible responsive dialog and focuses the requested field", async () => {
    render(<QuickActionFixture />);

    const trigger = screen.getByRole("button", {
      name: "Quick add location",
    });
    expect(trigger).toHaveClass("min-h-11", "min-w-11");
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "Quickly record a location",
    });
    expect(dialog).toHaveClass(
      "rounded-t-2xl",
      "sm:max-w-xl",
      "sm:rounded-2xl",
      "motion-reduce:transition-none",
    );
    expect(dialog).toHaveClass("pb-[env(safe-area-inset-bottom)]");
    await waitFor(() => expect(screen.getByLabelText("Location")).toHaveFocus());
    expect(document.body).toHaveStyle({ overflow: "hidden" });
  });

  it("traps Tab focus in both directions", async () => {
    render(<QuickActionFixture />);
    fireEvent.click(
      screen.getByRole("button", { name: "Quick add location" }),
    );

    const close = screen.getByRole("button", {
      name: "Close quick entry",
    });
    const save = screen.getByRole("button", { name: "Save draft" });
    await waitFor(() => expect(screen.getByLabelText("Location")).toHaveFocus());

    save.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(save).toHaveFocus();
  });

  it("closes on Escape and restores focus and page state", async () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <QuickActionFixture onOpenChange={onOpenChange} />,
    );
    const trigger = screen.getByRole("button", {
      name: "Quick add location",
    });
    trigger.focus();
    fireEvent.click(trigger);

    await waitFor(() => expect(container).toHaveAttribute("inert"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(container).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
  });

  it("closes when the backdrop is pressed", () => {
    render(<QuickActionFixture />);
    fireEvent.click(
      screen.getByRole("button", { name: "Quick add location" }),
    );
    const overlay = screen.getByTestId("admin-quick-action-overlay");
    const backdrop = overlay.querySelector<HTMLElement>("[aria-hidden='true']");

    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
