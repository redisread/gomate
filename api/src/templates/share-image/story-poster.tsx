import satori from "satori";

interface StoryPosterData {
  title: string;
  summary: string;
  coverImage?: string | null;
  authorName?: string;
  authorAvatar?: string | null;
  locationName?: string;
  qrCodeDataUrl?: string | null;
  fonts: Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>;
}

export async function renderStoryPoster(data: StoryPosterData): Promise<string> {
  const { title, summary, coverImage, authorName, authorAvatar, locationName, qrCodeDataUrl, fonts } = data;
  const fontFamily = fonts.length > 0 ? fonts[0].name : "system-ui";
  const cleanSummary = summary.length > 100 ? summary.slice(0, 97) + "..." : summary;

  const coverImageElement = coverImage ? {
    type: "div", props: {
      style: { display: "flex", marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: "hidden" },
      children: { type: "img", props: { src: coverImage, style: { display: "flex", width: 343, height: 180, objectFit: "cover" } } },
    },
  } : null;

  const svg = await satori(
    // @ts-expect-error
    {
      type: "div",
      props: {
        style: { display: "flex", flexDirection: "column", width: 375, backgroundColor: "#faf8f5", fontFamily },
        children: [
          ...(coverImageElement ? [coverImageElement] : []),
          {
            type: "div", props: {
              style: { display: "flex", flexDirection: "column", margin: 16, padding: 20, backgroundColor: "rgba(255,255,255,0.85)", border: "1px solid #e8e0d7", borderRadius: 12 },
              children: [
                { type: "h1", props: { style: { fontSize: 18, lineHeight: "28px", fontWeight: 700, color: "#1e1812", marginBottom: 8 }, children: title } },
                { type: "p", props: { style: { fontSize: 13, lineHeight: "20px", color: "#6b5e53", marginBottom: 12 }, children: cleanSummary } },
                { type: "div", props: { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: locationName ? 8 : 0 }, children: [
                  authorAvatar ? { type: "img", props: { src: authorAvatar, style: { width: 24, height: 24, borderRadius: 12 } } } :
                  { type: "div", props: { style: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }, children: { type: "span", props: { style: { fontSize: 10, color: "white" } }, children: authorName?.[0] || "?" } } },
                  { type: "span", props: { style: { fontSize: 12, color: "#1e1812", fontWeight: 500 }, children: authorName || "匿名" } },
                ] } },
                locationName ? { type: "div", props: { style: { display: "flex", gap: 4, marginBottom: 8 }, children: [
                  { type: "span", props: { style: { fontSize: 11, color: "#D97706" } }, children: "📍" },
                  { type: "span", props: { style: { fontSize: 11, color: "#6b5e53" } }, children: locationName },
                ] } } : null,
                qrCodeDataUrl ? { type: "img", props: { src: qrCodeDataUrl, style: { width: 64, height: 64, marginTop: 8, alignSelf: "center" } } } : null,
              ].filter(Boolean),
            },
          },
          { type: "div", props: { style: { display: "flex", justifyContent: "center", padding: 8, fontSize: 10, color: "#6b5e53" }, children: "GoMate - 发现趣处，组队同行" } },
        ].filter(Boolean),
      },
    },
    { width: 375, fonts }
  );

  return svg;
}
