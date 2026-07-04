import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import * as React from "react";
import { VditorEditor } from "../components/features/discover/vditor-editor";

/**
 * VditorEditor 组件测试
 *
 * 通过 mock vditor 模块模拟编辑器行为，验证：
 * - 初始化参数正确（sv 分屏模式）
 * - input 回调正确触发 onChange
 * - 外部 value 同步到编辑器
 * - 主题切换
 * - readOnly 切换
 * - 卸载时销毁
 * - stale closure 回归：输入内容与初始值相同时仍触发 onChange
 */

// --- Mock 状态追踪 ---
interface MockState {
  instance: MockVditor | null;
  inputCb: ((md: string) => void) | null;
  afterCb: (() => void) | null;
  destroyed: boolean;
  theme: "classic" | "dark";
  disabled: boolean;
  lastSetValue: string;
}

const mockState: MockState = {
  instance: null,
  inputCb: null,
  afterCb: null,
  destroyed: false,
  theme: "classic",
  disabled: false,
  lastSetValue: "",
};

class MockVditor {
  vditor: { options: Record<string, unknown> };
  constructor(_el: HTMLElement, options: Record<string, unknown>) {
    this.vditor = { options };
    mockState.instance = this;
    mockState.inputCb = (options.input as (md: string) => void) ?? null;
    mockState.afterCb = (options.after as (() => void)) ?? null;
    mockState.destroyed = false;
    mockState.theme = (options.theme as "classic" | "dark") ?? "classic";
    mockState.disabled = false;
    mockState.lastSetValue = "";
    // 模拟 after 回调在下一帧触发
    if (mockState.afterCb) {
      setTimeout(() => mockState.afterCb?.(), 0);
    }
  }
  getValue() { return mockState.lastSetValue; }
  setValue(v: string) {
    mockState.lastSetValue = v;
    // setValue 会触发 input 回调（与真实 Vditor 行为一致）
    if (mockState.inputCb) mockState.inputCb(v);
  }
  setTheme(theme: "classic" | "dark") { mockState.theme = theme; }
  disabled() { mockState.disabled = true; }
  enable() { mockState.disabled = false; }
  destroy() {
    mockState.destroyed = true;
    mockState.instance = null;
  }
  getHTML() { return mockState.lastSetValue; }
  insertValue() {}
  focus() {}
  blur() {}
}

vi.mock("vditor", () => ({
  default: MockVditor,
}));

vi.mock("vditor/dist/css/content-theme/dark.css", () => ({}));
vi.mock("vditor/dist/css/content-theme/light.css", () => ({}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const copy: Record<string, string> = {
        "content.writeStories": "Write your story...",
      };
      return copy[key] || key;
    },
  }),
}));

// --- 测试工具 ---
function createMatchMedia(matches: boolean) {
  return (query: string): MediaQueryList =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

function resetMockState() {
  mockState.instance = null;
  mockState.inputCb = null;
  mockState.afterCb = null;
  mockState.destroyed = false;
  mockState.theme = "classic";
  mockState.disabled = false;
  mockState.lastSetValue = "";
}

describe("VditorEditor", () => {
  beforeEach(() => {
    resetMockState();
    window.matchMedia = createMatchMedia(false);
    document.documentElement.classList.remove("dark");
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetMockState();
  });

  it("用正确的配置初始化 Vditor（sv 分屏模式）", async () => {
    const onChange = vi.fn();
    render(
      <VditorEditor
        value=""
        onChange={onChange}
        placeholder="输入内容..."
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const inst = mockState.instance;
    expect(inst).not.toBeNull();
    expect(inst?.vditor.options.mode).toBe("sv");
    expect(inst?.vditor.options.height).toBe("100%");
    expect(inst?.vditor.options.minHeight).toBe(400);
    expect(inst?.vditor.options.placeholder).toBe("输入内容...");
    expect(inst?.vditor.options.theme).toBe("classic");
    expect(Array.isArray(inst?.vditor.options.toolbar)).toBe(true);
    expect((inst?.vditor.options.toolbar as unknown[]).length).toBeGreaterThan(0);
    // preview 配置
    const preview = inst?.vditor.options.preview as { mode?: string } | undefined;
    expect(preview?.mode).toBe("both");
  });

  it("未传 placeholder 时使用 i18n 默认文案", async () => {
    const onChange = vi.fn();
    render(<VditorEditor value="" onChange={onChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockState.instance?.vditor.options.placeholder).toBe("Write your story...");
  });

  it("readOnly 为 true 时 toolbar 为空数组", async () => {
    const onChange = vi.fn();
    render(<VditorEditor value="" onChange={onChange} readOnly />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockState.instance?.vditor.options.toolbar).toEqual([]);
  });

  it("readOnly 为 true 时 resize 禁用", async () => {
    const onChange = vi.fn();
    render(<VditorEditor value="" onChange={onChange} readOnly />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const resize = mockState.instance?.vditor.options.resize as { enable?: boolean } | undefined;
    expect(resize?.enable).toBe(false);
  });

  it("input 回调触发 onChange", async () => {
    const onChange = vi.fn();
    render(<VditorEditor value="" onChange={onChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      mockState.inputCb?.("hello world");
    });

    expect(onChange).toHaveBeenCalledWith("hello world");
  });

  it("input 值与当前 value 相同时不触发 onChange（避免循环）", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<VditorEditor value="same" onChange={onChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // 外部 value 更新为 "same"
    rerender(<VditorEditor value="same" onChange={onChange} />);
    onChange.mockClear();

    // 模拟编辑器发出与当前 value 相同的 input
    act(() => {
      mockState.inputCb?.("same");
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("stale closure 回归：输入内容与初始值相同时仍触发 onChange", async () => {
    // 核心回归测试：初始 value = "hello"，用户改成 "world"，
    // 再改回 "hello"。如果闭包捕获的是初始值，第二次 onChange 会被跳过。
    const onChange = vi.fn();
    const { rerender } = render(<VditorEditor value="hello" onChange={onChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // 用户输入 "world"
    act(() => { mockState.inputCb?.("world"); });
    expect(onChange).toHaveBeenCalledWith("world");

    // 外部 state 更新为 "world"
    rerender(<VditorEditor value="world" onChange={onChange} />);
    onChange.mockClear();

    // 用户再输入 "hello"（与初始值相同）
    act(() => { mockState.inputCb?.("hello"); });
    // 关键断言：即使与初始值相同，只要与当前 value 不同就该触发
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("外部 value 变化时同步到编辑器", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<VditorEditor value="a" onChange={onChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      rerender(<VditorEditor value="b" onChange={onChange} />);
    });

    expect(mockState.lastSetValue).toBe("b");
  });

  it("系统偏好暗色时初始化为 dark 主题", async () => {
    window.matchMedia = createMatchMedia(true);
    const onChange = vi.fn();
    render(<VditorEditor value="" onChange={onChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockState.theme).toBe("dark");
  });

  it("readOnly 切换时调用 disabled/enable", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<VditorEditor value="" onChange={onChange} readOnly />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockState.disabled).toBe(true);

    rerender(<VditorEditor value="" onChange={onChange} readOnly={false} />);

    expect(mockState.disabled).toBe(false);
  });

  it("卸载时销毁实例", async () => {
    const onChange = vi.fn();
    const { unmount } = render(<VditorEditor value="" onChange={onChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockState.instance).not.toBeNull();

    unmount();

    expect(mockState.destroyed).toBe(true);
    expect(mockState.instance).toBeNull();
  });

  it("onChange 引用变化时使用最新回调", async () => {
    const onChange1 = vi.fn();
    const onChange2 = vi.fn();
    const { rerender } = render(<VditorEditor value="" onChange={onChange1} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    rerender(<VditorEditor value="" onChange={onChange2} />);
    onChange1.mockClear();

    act(() => {
      mockState.inputCb?.("new text");
    });

    expect(onChange1).not.toHaveBeenCalled();
    expect(onChange2).toHaveBeenCalledWith("new text");
  });

  it("after 回调中用最新 value 初始化编辑器", async () => {
    const onChange = vi.fn();
    render(<VditorEditor value="initial content" onChange={onChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // after 回调会调用 setValue(valueRef.current)
    expect(mockState.lastSetValue).toBe("initial content");
  });
});
