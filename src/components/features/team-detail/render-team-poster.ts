import type { TeamPosterContent } from "./team-poster-content";
import { renderPoster } from "../share-poster/render-poster";

export function renderTeamPoster(
  content: TeamPosterContent,
  signal: AbortSignal,
) {
  return renderPoster(content, signal, ({ context, color, text, box }) => {
    text(content.activity, 64, 628, 450, 48, 32, color("brand"), 600);
    text(content.capacity, 600, 628, 416, 48, 30, color("muted"));
    text(content.title, 64, 698, 952, 172, 64, color("ink"), 700);
    text(content.location, 64, 890, 952, 66, 32, color("muted"));

    box(64, 984, 952, 172, 28, color("surface"));
    context.strokeStyle = color("border");
    context.setLineDash([6, 8]);
    context.beginPath();
    context.moveTo(520, 1008);
    context.lineTo(520, 1132);
    context.stroke();
    context.setLineDash([]);
    text(`${content.date} · ${content.weekday}`, 96, 1010, 392, 48, 32);
    text(content.startTime, 96, 1072, 392, 64, 48, color("brand"), 700);
    text(content.endLabel, 552, 1010, 432, 36, 26, color("muted"));
    text(content.endTime, 552, 1050, 432, 48, 32, color("ink"), 600);
    text(content.timeZone, 552, 1110, 432, 32, 24, color("muted"));
  });
}
