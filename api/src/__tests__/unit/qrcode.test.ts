import { describe, it, expect, vi } from "vitest";
import QRCode from "qrcode";

// Mock QRCode.toDataURL
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(),
  },
}));

describe("QR Code Generation", () => {
  it("should generate QR code with the provided text", async () => {
    const mockDataUrl = "data:image/png;base64,mockedQrCodeData";
    (QRCode.toDataURL as any).mockResolvedValue(mockDataUrl);

    // Import the function dynamically to get the real implementation
    const { generateQRCode } = await import("../services/share-image/generate-share-image");

    const testUrl = "https://gomate.live/locations/test-location";
    const result = await generateQRCode(testUrl);

    // Verify QRCode.toDataURL was called with the correct text
    expect(QRCode.toDataURL).toHaveBeenCalledWith(testUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#1e1812",
        light: "#ffffff",
      },
    });
    expect(result).toBe(mockDataUrl);
  });

  it("should generate different QR codes for different URLs", async () => {
    const mockDataUrl1 = "data:image/png;base64,qrCode1";
    const mockDataUrl2 = "data:image/png;base64,qrCode2";
    (QRCode.toDataURL as any)
      .mockResolvedValueOnce(mockDataUrl1)
      .mockResolvedValueOnce(mockDataUrl2);

    const { generateQRCode } = await import("../services/share-image/generate-share-image");

    const url1 = "https://gomate.live/locations/location-1";
    const url2 = "https://gomate.live/teams/team-2";

    const result1 = await generateQRCode(url1);
    const result2 = await generateQRCode(url2);

    // Verify different URLs generate different QR codes
    expect(QRCode.toDataURL).toHaveBeenCalledTimes(2);
    expect(QRCode.toDataURL).toHaveBeenNthCalledWith(1, url1, expect.any(Object));
    expect(QRCode.toDataURL).toHaveBeenNthCalledWith(2, url2, expect.any(Object));
    expect(result1).toBe(mockDataUrl1);
    expect(result2).toBe(mockDataUrl2);
    expect(result1).not.toBe(result2);
  });

  it("should fallback to placeholder on error", async () => {
    (QRCode.toDataURL as any).mockRejectedValue(new Error("QR generation failed"));

    const { generateQRCode } = await import("../services/share-image/generate-share-image");

    const testUrl = "https://gomate.live/locations/test";
    const result = await generateQRCode(testUrl);

    // Verify fallback placeholder is returned
    expect(result).toContain("data:image/svg+xml;base64");
  });
});
