import { describe, expect, it } from "vitest";
import { getShareImageErrorMessage, readShareImageBlob } from "./share-image-client";

describe("share image client", () => {
  it("reads the message from the standard nested API error", () => {
    expect(
      getShareImageErrorMessage(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to generate location image",
            details: "internal implementation detail",
          },
        },
        500,
      ),
    ).toBe("Failed to generate location image");
  });

  it("never stringifies an error object as [object Object]", () => {
    expect(getShareImageErrorMessage({ error: { code: "INTERNAL_ERROR" } }, 500)).toBe(
      "Failed to generate image: 500",
    );
  });

  it("rejects a successful JSON response instead of treating it as an image", async () => {
    const response = new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    await expect(readShareImageBlob(response)).rejects.toThrow("Failed to generate image: 200");
  });
});
