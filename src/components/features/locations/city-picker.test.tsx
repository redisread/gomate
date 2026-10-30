import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import type { Region } from "@/lib/types";
import { CityPicker } from "./city-picker";

vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ t: (key: string) => key, loading: false }) }));
const regions = [
  { id: "sz", name: "深圳", nameEn: "Shenzhen", slug: "shenzhen" },
  { id: "hz", name: "惠州", nameEn: "Huizhou", slug: "huizhou" },
] as Region[];

function Picker({ onSelect = vi.fn() }: { onSelect?: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return <CityPicker regions={regions} selectedRegionId="sz" open={open} onOpenChange={setOpen} onSelect={onSelect} />;
}

describe("CityPicker", () => {
  it("打开后聚焦搜索，搜索支持英文并能用键盘选择城市", async () => {
    const onSelect = vi.fn();
    render(<Picker onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "locations.moreCities" }));
    const input = screen.getByRole("combobox", { name: "locations.searchCities" });
    expect(input).toHaveFocus();
    expect(screen.getByRole("option", { name: "深圳" })).toHaveAttribute("aria-selected", "true");
    fireEvent.change(input, { target: { value: "Huizhou" } });
    expect(screen.queryByRole("option", { name: "深圳" })).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant");
    await act(async () => fireEvent.keyDown(input, { key: "Enter" }));
    expect(onSelect).toHaveBeenCalledWith("hz");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "locations.moreCities" })).toHaveFocus());
  });

  it("首次向上选择最后一项，并能循环回到第一项", async () => {
    const onSelect = vi.fn();
    render(<Picker onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "locations.moreCities" }));
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "惠州" }).id);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "locations.anyCity" }).id);
    await act(async () => fireEvent.keyDown(input, { key: "Enter" }));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  it("Escape 关闭并恢复焦点，不更改已有城市", async () => {
    const onSelect = vi.fn();
    render(<Picker onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "locations.moreCities" }));
    await act(async () => fireEvent.keyDown(document, { key: "Escape" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "locations.moreCities" })).toHaveFocus());
    expect(onSelect).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("");
    expect(document.querySelector("[inert]")).not.toBeInTheDocument();
  });
});
