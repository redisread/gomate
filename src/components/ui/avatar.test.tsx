import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("keeps an accessible name and initials while an image is unavailable", () => {
    render(<Avatar name="林" src="/missing-avatar.png" />);
    expect(screen.getByText("林")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "林" })).toBeInTheDocument();
  });
  it("keeps the existing initial and size for a member without a photo", () => {
    render(<Avatar name="alex" size="xs" />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "alex" })).toHaveClass("h-6", "w-6");
  });
});
