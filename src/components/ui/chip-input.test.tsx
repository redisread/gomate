import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { ChipInput } from "./chip-input";

/**
 * task #166（P0-A T3）：ChipInput 单测
 * 覆盖：Enter 提交 / 逗号提交 / Backspace 空态删末项 / 去重 / maxItems / 长度限
 */

function Harness({
  initial,
  onChangeSpy,
  ...rest
}: {
  initial: string[];
  onChangeSpy?: (v: string[]) => void;
  splitOnComma?: boolean;
  splitOnSpace?: boolean;
  maxItems?: number;
  maxItemLength?: number;
}) {
  const [values, setValues] = React.useState<string[]>(initial);
  return (
    <ChipInput
      values={values}
      onChange={(next) => {
        setValues(next);
        onChangeSpy?.(next);
      }}
      placeholder="输入后回车"
      {...rest}
    />
  );
}

describe("ChipInput", () => {
  it("Enter 提交当前输入并追加为 chip", () => {
    const spy = (v: string[]) => (received = v);
    let received: string[] = [];
    render(<Harness initial={[]} onChangeSpy={spy} />);
    const input = screen.getByPlaceholderText("输入后回车") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "登山鞋" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(received).toEqual(["登山鞋"]);
    expect(input.value).toBe("");
  });

  it("英文逗号触发提交", () => {
    let received: string[] = [];
    render(<Harness initial={["A"]} onChangeSpy={(v) => (received = v)} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "B" } });
    fireEvent.keyDown(input, { key: "," });
    expect(received).toEqual(["A", "B"]);
  });

  it("中文全角逗号触发提交", () => {
    let received: string[] = [];
    render(<Harness initial={[]} onChangeSpy={(v) => (received = v)} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "水" } });
    fireEvent.keyDown(input, { key: "，" });
    expect(received).toEqual(["水"]);
  });

  it("Backspace 在空输入时删末项，非空时不删", () => {
    let received: string[] = [];
    render(<Harness initial={["A", "B"]} onChangeSpy={(v) => (received = v)} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    // 空 draft → 删末项
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(received).toEqual(["A"]);
    // 有 draft → 不删
    received = [];
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(received).toEqual([]);
  });

  it("重复输入去重（保留原顺序）", () => {
    let received: string[] = [];
    render(<Harness initial={["登山鞋"]} onChangeSpy={(v) => (received = v)} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "登山鞋" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // 未触发 onChange（重复被吞掉）
    expect(received).toEqual([]);
    // draft 仍然被清空
    expect(input.value).toBe("");
  });

  it("达到 maxItems 后不再追加", () => {
    let received: string[] = [];
    render(<Harness initial={["A", "B"]} maxItems={2} onChangeSpy={(v) => (received = v)} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "C" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(received).toEqual([]);
  });

  it("单项超长（maxItemLength）时 onChange 被拒", () => {
    render(<Harness initial={[]} maxItemLength={5} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12345" } });
    expect(input.value).toBe("12345");
    fireEvent.change(input, { target: { value: "123456" } });
    expect(input.value).toBe("12345"); // 拒收
  });

  it("失焦时残余 draft 视为一个 chip 提交", () => {
    let received: string[] = [];
    render(<Harness initial={[]} onChangeSpy={(v) => (received = v)} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "水" } });
    fireEvent.blur(input);
    expect(received).toEqual(["水"]);
  });

  it("空 draft Enter/blur 都不追加空 chip", () => {
    let received: string[] = [];
    render(<Harness initial={["A"]} onChangeSpy={(v) => (received = v)} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    expect(received).toEqual([]);
  });

  it("chip 上的删除按钮移除对应项", () => {
    let received: string[] = [];
    render(<Harness initial={["A", "B", "C"]} onChangeSpy={(v) => (received = v)} />);
    const removeB = screen.getByLabelText("remove B");
    fireEvent.click(removeB);
    expect(received).toEqual(["A", "C"]);
  });
});
