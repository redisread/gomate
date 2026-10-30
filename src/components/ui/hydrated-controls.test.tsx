import { act, fireEvent } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { HydratedControls } from "./hydrated-controls";

it("enables controls only after hydration attaches their handlers, keeping native links available", async () => {
  const click = vi.fn();
  const content = <HydratedControls><button onClick={click}>Next</button><input aria-label="Search" /><a href="/teams/one">Team</a></HydratedControls>;
  const container = document.createElement("div");
  container.innerHTML = renderToString(content);
  document.body.appendChild(container);
  const button = container.querySelector("button")!;
  expect(button).toBeDisabled();
  expect(container.querySelector("input")).toBeDisabled();
  expect(container.querySelector("a")).toHaveAttribute("href", "/teams/one");
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, content); });
    expect(button).toBeEnabled();
    expect(container.querySelector("input")).toBeEnabled();
    fireEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});
