import { renderPoster } from "../share-poster/render-poster";
import type { LocationPosterContent } from "./location-poster-content";

export function renderLocationPoster(
  content: LocationPosterContent,
  signal: AbortSignal,
) {
  return renderPoster(content, signal, ({ color, text, excerpt }) => {
    text(content.title, 64, 628, 952, 176, 64, color("ink"), 700);
    let y = 824;
    if (content.region) {
      excerpt(content.region, 64, y, 952, 40, 30, color("muted"));
      y += 52;
    }
    if (content.activity) {
      excerpt(content.activity, 64, y, 952, 76, 30, color("brand"), 600);
      y += 88;
    }
    if (content.seasons) {
      excerpt(
        `${content.seasonsLabel} ${content.seasons}`,
        64,
        y,
        952,
        40,
        28,
        color("muted"),
      );
      y += 52;
    }
    if (content.introduction) {
      excerpt(content.introduction, 64, y, 952, 1156 - y, 32);
    }
  });
}
