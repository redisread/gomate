import { describe, expect, it } from "vitest";
import { locationImagesAreAllowed } from "./utils";

const env = { R2_PUBLIC_URL: "https://media.example.test" };
const allowed = (coverImageUrl: string) => locationImagesAreAllowed({ coverImageUrl, images: [] }, env);

describe("managed image URL identities", () => {
  it.each([
    "https://media.example.test/locations/a/b.webp?download=1",
    "https://media.example.test/locations/a/%62.webp",
    "https://media.example.test/locations/./a/b.webp",
    "https://%6dedia.example.test/locations/a/b.webp",
  ])("rejects non-canonical managed references: %s", (value) => expect(allowed(value)).toBe(false));
  it("retains canonical media and third-party image references", () => {
    expect(allowed("https://media.example.test/locations/a/b.webp")).toBe(true);
    expect(allowed("https://cdn.discordapp.com/file.webp?size=200")).toBe(true);
  });
});
