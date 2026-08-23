import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AdminNavigation } from "./admin-navigation";

const copy = {
  brand: "GoMate Admin",
  navigationLabel: "Admin navigation",
  navHome: "Admin home",
  navNewLocation: "Add location",
  navLocations: "Locations",
  navTags: "Tags",
  navUsers: "Users",
  backToFrontend: "Back to site",
  openNavigation: "Open admin navigation",
  closeNavigation: "Close admin navigation",
};

describe("AdminNavigation", () => {
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

  it("renders only real routes and marks the current page", () => {
    render(
      <AdminNavigation
        copy={copy}
        currentPath="/admin"
        admin={{ id: "admin-1", displayName: "Admin", image: null }}
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: copy.navigationLabel,
    });
    const links = Array.from(navigation.querySelectorAll("a"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin",
      "/admin/locations",
      "/admin/locations/new",
      "/admin/tags",
      "/admin/users",
      "/",
    ]);
    expect(
      screen.getAllByRole("link", { name: copy.navHome })[0],
    ).toHaveAttribute("aria-current", "page");
  });

  it("opens the mobile drawer with an accessible 44px trigger", () => {
    render(
      <AdminNavigation
        copy={copy}
        currentPath="/admin"
        admin={{ id: "admin-1", displayName: "Admin", image: null }}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: copy.openNavigation,
    });
    expect(trigger).not.toHaveFocus();
    expect(trigger).toHaveClass("min-h-11", "min-w-11");
    fireEvent.click(trigger);

    const drawer = screen.getByRole("dialog", {
      name: copy.navigationLabel,
    });
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveClass("motion-reduce:transition-none");
    expect(
      screen.getByRole("button", { name: copy.closeNavigation }),
    ).toHaveFocus();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    render(
      <AdminNavigation
        copy={copy}
        currentPath="/admin/locations/new"
        admin={{ id: "admin-1", displayName: "Admin", image: null }}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: copy.openNavigation,
    });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("makes the page inert, locks scrolling, and traps drawer focus", async () => {
    const { container } = render(
      <AdminNavigation
        copy={copy}
        currentPath="/admin"
        admin={{ id: "admin-1", displayName: "Admin", image: null }}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: copy.openNavigation,
    });
    fireEvent.click(trigger);

    const drawer = screen.getByRole("dialog", {
      name: copy.navigationLabel,
    });
    const brand = within(drawer).getByRole("link", { name: copy.brand });
    const lastLink = within(drawer).getByRole("link", {
      name: copy.backToFrontend,
    });
    await waitFor(() => expect(container).toHaveAttribute("inert"));
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    lastLink.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(brand).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(lastLink).toHaveFocus();

    fireEvent.click(within(drawer).getByRole("button", {
      name: copy.closeNavigation,
    }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(container).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");
  });
});
