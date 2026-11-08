import { renderPoster } from "../share-poster/render-poster";
import type { LocationPosterContent } from "./location-poster-content";

export function renderLocationPoster(
  content: LocationPosterContent,
  signal: AbortSignal,
) {
  return renderPoster(content, signal, ({ color, text, excerpt }) => {
    const titleHeight = text(
      content.title,
      64,
      628,
      952,
      176,
      64,
      color("ink"),
      700,
    );
    let y = 628 + titleHeight + 24;
    if (content.region) {
      y += excerpt(content.region, 64, y, 952, 40, 30, color("muted")) + 16;
    }
    if (content.activity) {
      y +=
        excerpt(content.activity, 64, y, 952, 76, 30, color("brand"), 600) + 16;
    }
    if (content.seasons) {
      y +=
        excerpt(
          `${content.seasonsLabel} ${content.seasons}`,
          64,
          y,
          952,
          40,
          28,
          color("muted"),
        ) + 20;
    }
    if (content.introduction) {
      excerpt(content.introduction, 64, y, 952, 1156 - y, 32);
    }
  });
}
