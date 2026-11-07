import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InterestPicker } from "./interest-picker";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
const tags = Array.from({ length: 22 }, (_, index) => ({
  id: `tag-${index}`,
  name: `兴趣${index}`,
}));

describe("InterestPicker", () => {
  it("完整目录可选择非快捷兴趣，取消丢弃草稿，应用一次提交", async () => {
    const apply = vi.fn();
    render(
      <InterestPicker
        tags={tags}
        selectedTags={["tag-0"]}
        onToggle={vi.fn()}
        onApply={apply}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "locations.allInterests",
    });
    fireEvent.click(trigger);
    let dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "兴趣18" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "common.cancel" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(apply).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(trigger);
    dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("button", { name: "兴趣18" }),
    ).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(within(dialog).getByRole("button", { name: "兴趣18" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "locations.applyInterests" }),
    );
    expect(apply).toHaveBeenCalledExactlyOnceWith(["tag-0", "tag-18"]);
  });

  it("已选非快捷兴趣保持可见，并限制 API 支持的二十项", () => {
    const toggle = vi.fn();
    render(
      <InterestPicker
        tags={tags}
        selectedTags={tags.slice(2).map((tag) => tag.id)}
        onToggle={toggle}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "兴趣21" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "兴趣0" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "兴趣21" }));
    expect(toggle).toHaveBeenCalledWith("tag-21");
    fireEvent.click(
      screen.getByRole("button", { name: "locations.allInterests" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("button", { name: "兴趣0" }),
    ).toBeDisabled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "locations.clearInterests" }),
    );
    expect(within(dialog).getByRole("button", { name: "兴趣0" })).toBeEnabled();
  });
});
