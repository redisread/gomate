import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Footer } from "@/components/layout/footer";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Footer", () => {
  it("does not accept contact clicks before hydration attaches the handler", () => {
    const shell = document.createElement("div");
    shell.innerHTML = renderToStaticMarkup(<Footer />);
    expect(shell.querySelector('button[aria-label="common.socials.wechat"]')).toHaveAttribute("disabled");
    render(<Footer />);
    expect(screen.getByRole("button", { name: "common.socials.wechat" })).toBeEnabled();
  });

  it("keeps all navigation and social contacts available on small screens", () => {
    vi.stubGlobal("innerWidth", 375);
    render(<Footer />);
    for (const href of [
      "/locations",
      "/teams",
      "/teams/create",
      "/about",
      "/blog",
      "/feedback",
      "/help",
      "/privacy",
      "/terms",
      "https://t.me/gomate111",
      "https://xhslink.com/m/4nG6kEejTq3",
    ]) {
      expect(
        screen
          .getAllByRole("link")
          .some((link) => link.getAttribute("href") === href),
      ).toBe(true);
    }
    expect(
      screen.getByRole("button", { name: "common.socials.wechat" }),
    ).toBeVisible();
    vi.unstubAllGlobals();
  });

  it("opens an accessible contact dialog and restores focus after Escape", async () => {
    render(<Footer />);
    const trigger = screen.getByRole("button", {
      name: "common.socials.wechat",
    });
    trigger.focus();
    fireEvent.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "common.socials.wechat" }),
    ).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it.each([true, false])(
    "honors reduced motion (%s) when returning to top",
    (reduced) => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: reduced,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
      render(<Footer />);
      fireEvent.click(screen.getByRole("button", { name: "common.backToTop" }));
      expect(scroll).toHaveBeenCalledWith({
        top: 0,
        behavior: reduced ? "instant" : "smooth",
      });
    },
  );
});
