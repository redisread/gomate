import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    expect(await screen.findAllByText("ui.upload.invalidType")).not.toHaveLength(0);
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

    expect(await screen.findAllByText("ui.upload.invalidImageContent")).not.toHaveLength(0);
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
});
