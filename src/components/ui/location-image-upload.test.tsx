import { useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CoverImageUpload } from "./cover-image-upload";
import { MultiImageUpload } from "./multi-image-upload";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values?.size ? `${key}:${values.size}` : key,
  }),
}));

type Listener = () => void;

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];

  readonly upload = { addEventListener: vi.fn() };
  readonly listeners = new Map<string, Listener>();
  status = 0;
  responseText = "";

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, listener);
  }

  open = vi.fn();
  send = vi.fn();

  respond(status: number, responseText: string) {
    this.status = status;
    this.responseText = responseText;
    this.listeners.get("load")?.();
  }
}

describe("location image uploads", () => {
  beforeEach(() => {
    MockXMLHttpRequest.instances = [];
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);
  });

  it("offers the formats accepted by the endpoint, including iPhone HEIC", () => {
    const { container } = render(
      <CoverImageUpload value="" onChange={vi.fn()} />,
    );

    expect(container.querySelector('input[type="file"]')).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif",
    );
  });

  it("rejects unsupported image formats before starting a cover upload", async () => {
    const { container } = render(
      <CoverImageUpload value="" onChange={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input!, {
      target: {
        files: [new File(["avif"], "photo.avif", { type: "image/avif" })],
      },
    });

    expect(
      await screen.findAllByText("ui.upload.invalidType"),
    ).not.toHaveLength(0);
    expect(MockXMLHttpRequest.instances).toHaveLength(0);
  });

  it("shows the structured server rejection instead of only the HTTP status", async () => {
    const { container } = render(
      <CoverImageUpload value="" onChange={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input!, {
      target: {
        files: [new File(["jpeg"], "photo.jpg", { type: "image/jpeg" })],
      },
    });
    MockXMLHttpRequest.instances[0]?.respond(
      400,
      JSON.stringify({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "File content does not match the declared format",
          details: { reason: "invalid_image_content" },
        },
      }),
    );

    expect(
      await screen.findAllByText("ui.upload.invalidImageContent"),
    ).not.toHaveLength(0);
  });

  it("shows a specific message when HEIC conversion fails", async () => {
    const { container } = render(
      <CoverImageUpload value="" onChange={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input!, {
      target: {
        files: [new File(["heic"], "photo.heic", { type: "image/heic" })],
      },
    });
    MockXMLHttpRequest.instances[0]?.respond(
      400,
      JSON.stringify({
        success: false,
        error: {
          code: "BAD_REQUEST",
          details: { reason: "image_conversion_failed" },
        },
      }),
    );

    expect(
      await screen.findAllByText("ui.upload.imageConversionFailed"),
    ).not.toHaveLength(0);
  });

  it("lets the server inspect iPhone files whose MIME and extension disagree", () => {
    const { container } = render(
      <CoverImageUpload value="" onChange={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input!, {
      target: {
        files: [new File(["jpeg"], "photo.heic", { type: "image/jpeg" })],
      },
    });

    expect(MockXMLHttpRequest.instances).toHaveLength(1);
  });

  it("renders an actionable error for unsupported gallery files", async () => {
    const { container } = render(
      <MultiImageUpload values={[]} onChange={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input!, {
      target: {
        files: [new File(["svg"], "vector.svg", { type: "image/svg+xml" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("ui.upload.invalidType")).toBeInTheDocument();
    });
    expect(MockXMLHttpRequest.instances).toHaveLength(0);
  });
  it("keeps every upload when files finish out of order in the same render batch", async () => {
    function Gallery() {
      const [values, setValues] = useState(["/existing.jpg"]);
      return (
        <>
          <MultiImageUpload values={values} onChange={setValues} />
          <output>{JSON.stringify(values)}</output>
        </>
      );
    }
    const { container } = render(<Gallery />);
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [
          new File(["a"], "a.jpg", { type: "image/jpeg" }),
          new File(["b"], "b.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    await act(async () => {
      MockXMLHttpRequest.instances[1]!.respond(
        200,
        JSON.stringify({ url: "/b.jpg" }),
      );
      MockXMLHttpRequest.instances[0]!.respond(
        200,
        JSON.stringify({ url: "/a.jpg" }),
      );
    });
    const saved = JSON.parse(container.querySelector("output")!.textContent!);
    expect(saved[0]).toBe("/existing.jpg");
    expect(saved.slice(1).sort()).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("does not restore a removed image when an in-flight upload completes", async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <MultiImageUpload values={["/removed.jpg"]} onChange={onChange} />,
    );
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["a"], "a.jpg", { type: "image/jpeg" })] },
    });
    rerender(<MultiImageUpload values={[]} onChange={onChange} />);
    await act(async () => {
      MockXMLHttpRequest.instances[0]!.respond(
        200,
        JSON.stringify({ url: "/a.jpg" }),
      );
    });
    expect(onChange).toHaveBeenLastCalledWith(["/a.jpg"]);
  });
  it("reserves capacity across consecutive selections and releases failed slots", async () => {
    const { container } = render(
      <MultiImageUpload values={[]} onChange={vi.fn()} max={2} />,
    );
    const input = container.querySelector('input[type="file"]')!;
    const file = new File(["a"], "a.jpg", { type: "image/jpeg" });
    act(() => {
      fireEvent.change(input, { target: { files: [file] } });
      fireEvent.change(input, { target: { files: [file, file] } });
    });
    expect(MockXMLHttpRequest.instances).toHaveLength(2);
    await act(async () => {
      MockXMLHttpRequest.instances[0]!.respond(500, "");
    });
    expect(screen.getByText("ui.upload.uploadServerError")).toBeVisible();
    fireEvent.change(input, { target: { files: [file, file] } });
    expect(MockXMLHttpRequest.instances).toHaveLength(3);
  });

  it("does not commit completed uploads after the gallery unmounts", async () => {
    const onChange = vi.fn();
    const { container, unmount } = render(
      <MultiImageUpload values={[]} onChange={onChange} />,
    );
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["a"], "a.jpg", { type: "image/jpeg" })] },
    });
    unmount();
    await act(async () => {
      MockXMLHttpRequest.instances[0]!.respond(
        200,
        JSON.stringify({ url: "/a.jpg" }),
      );
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
