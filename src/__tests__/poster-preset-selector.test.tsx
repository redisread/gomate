import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosterPresetSelector } from "../components/features/poster-preset-selector";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("PosterPresetSelector", () => {
  it("exposes three named radio choices and reports selection", () => {
    const onChange = vi.fn();
    render(<PosterPresetSelector value="dusk" onChange={onChange} />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[0]).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: /posterPresetRidge/ }));
    expect(onChange).toHaveBeenCalledWith("ridge");
  });

  it("has a localized group name and touch-sized choices", () => {
    render(<PosterPresetSelector value="journal" onChange={vi.fn()} />);

    expect(screen.getByRole("group", { name: "share.posterPresetLabel" })).toBeVisible();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.nextElementSibling).toHaveClass("min-h-11");
    }
  });
});
