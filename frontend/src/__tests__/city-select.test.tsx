import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { City } from "../lib/types";
import { CitySelect } from "../components/ui/city-select";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const cities = Array.from({ length: 25 }, (_, index) => ({
  id: `city-${index + 1}`,
  adcode: `${index + 1}`,
  name: `城市 ${index + 1}`,
  province: "测试省",
  level: "city",
  isHot: false,
})) as City[];

describe("CitySelect", () => {
  it("在没有搜索词时也能浏览完整城市列表", () => {
    render(<CitySelect value="" onChange={vi.fn()} cities={cities} />);

    fireEvent.click(screen.getByRole("button", { name: "common.selectCity" }));

    expect(screen.getByText("城市 25")).toBeInTheDocument();
  });
});
