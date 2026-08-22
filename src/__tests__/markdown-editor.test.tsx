import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "../components/features/discover/markdown-editor";

describe("MarkdownEditor", () => {
  it("renders a controlled textarea and emits Markdown changes", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="hello" onChange={onChange} />);

    const editor = screen.getByRole("textbox");
    expect(editor).toHaveValue("hello");
    fireEvent.change(editor, { target: { value: "hello\nworld" } });
    expect(onChange).toHaveBeenCalledWith("hello\nworld");
  });

  it("supports read-only rendering without editor runtime dependencies", () => {
    render(<MarkdownEditor value="published" onChange={vi.fn()} readOnly />);

    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
  });
});
