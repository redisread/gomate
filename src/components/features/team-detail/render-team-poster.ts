import qrcode from "qrcode-generator";
import type { TeamPosterContent } from "./team-poster-content";

const WIDTH = 1080;
const HEIGHT = 1440;

async function readImage(
  source: string,
  signal: AbortSignal,
): Promise<ImageBitmap | null> {
  const url = new URL(source, window.location.origin);
  if (!/^https?:$/.test(url.protocol)) return null;
  const path =
    url.origin === window.location.origin
      ? url.href
      : `/api/proxy-image?url=${encodeURIComponent(url.href)}`;
  const response = await fetch(path, {
    signal,
    credentials: "omit",
    redirect: "error",
  });
  signal.throwIfAborted();
  if (
    !response.ok ||
    !/^image\/(png|jpeg|webp|gif|avif)(;|$)/i.test(
      response.headers.get("content-type") ?? "",
    )
  )
    return null;
  if (Number(response.headers.get("content-length")) > 15 * 1024 * 1024)
    return null;
  const blob = await response.blob();
  signal.throwIfAborted();
  if (blob.size > 15 * 1024 * 1024) return null;
  return createImageBitmap(blob);
}

function loadImage(
  source: string | null,
  signal: AbortSignal,
): Promise<ImageBitmap | null> {
  if (!source || signal.aborted) return Promise.resolve(null);
  const controller = new AbortController();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (image: ImageBitmap | null) => {
      if (settled) {
        image?.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      resolve(image);
    };
    const abort = () => {
      controller.abort();
      // Settle independently of the browser delivering a rejected fetch/decode.
      finish(null);
    };
    const timer = setTimeout(abort, 8_000);
    signal.addEventListener("abort", abort, { once: true });
    void readImage(source, controller.signal).then(finish, () => finish(null));
  });
}

/** Word boundaries for Latin text, grapheme boundaries for CJK and long words. */
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const words = new Intl.Segmenter(undefined, { granularity: "word" }).segment(
    text.replace(/\s+/gu, " ").trim(),
  );
  const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const lines: string[] = [];
  let line = "";
  for (const { segment: word } of words) {
    if (context.measureText(line + word).width <= width) {
      line += word;
      continue;
    }
    if (line.trim()) lines.push(line.trimEnd());
    line = "";
    for (const { segment } of graphemes.segment(word.trimStart())) {
      if (line && context.measureText(line + segment).width > width) {
        lines.push(line);
        line = "";
      }
      line += segment;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

export async function renderTeamPoster(
  content: TeamPosterContent,
  signal: AbortSignal,
) {
  await document.fonts.ready;
  const [cover, logo] = await Promise.all([
    loadImage(content.coverUrl, signal),
    loadImage("/icon-512.png", signal),
  ]);
  try {
    signal.throwIfAborted();
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("poster_canvas_unavailable");
    const styles = getComputedStyle(document.documentElement);
    const color = (name: string) =>
      styles.getPropertyValue(`--poster-${name}`).trim();
    const font = styles.fontFamily;
    context.textBaseline = "top";

    function box(
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
      fill: string,
    ) {
      context!.fillStyle = fill;
      context!.beginPath();
      context!.roundRect(x, y, width, height, radius);
      context!.fill();
    }
    function text(
      value: string,
      x: number,
      y: number,
      width: number,
      height: number,
      size: number,
      fill = color("ink"),
      weight = 400,
    ) {
      let lines: string[];
      let lineHeight: number;
      do {
        context!.font = `${weight} ${size}px ${font}`;
        lineHeight = size * 1.25;
        lines = wrapText(context!, value, width);
        if (lines.length * lineHeight <= height) break;
        size -= 2;
      } while (size >= 16);
      // Unsupported legacy lengths fail explicitly instead of clipping text into the QR area.
      if (lines.length * lineHeight > height)
        throw new Error("poster_text_overflow");
      if (lines.length > 1) {
        // Keep the chosen font size while balancing the final line's visual weight.
        let lower = width / lines.length;
        let upper = width;
        for (let step = 0; step < 8; step++) {
          const candidate = (lower + upper) / 2;
          if (wrapText(context!, value, candidate).length <= lines.length)
            upper = candidate;
          else lower = candidate;
        }
        lines = wrapText(context!, value, upper);
      }
      context!.fillStyle = fill;
      lines.forEach((line, index) =>
        context!.fillText(line, x, y + index * lineHeight),
      );
    }

    box(0, 0, WIDTH, HEIGHT, 0, color("background"));
    if (logo) context.drawImage(logo, 56, 48, 72, 72);
    text("GoMate", 144, 64, 300, 56, 44, color("ink"), 700);
    text(content.status, 660, 76, 356, 48, 30, color("brand"), 600);

    box(64, 152, 952, 440, 32, color("surface"));
    if (cover) {
      context.save();
      context.beginPath();
      context.roundRect(64, 152, 952, 440, 32);
      context.clip();
      const scale = Math.max(952 / cover.width, 440 / cover.height);
      context.drawImage(
        cover,
        64 + (952 - cover.width * scale) / 2,
        152 + (440 - cover.height * scale) / 2,
        cover.width * scale,
        cover.height * scale,
      );
      context.restore();
    } else {
      text(content.location, 112, 280, 856, 200, 64, color("brand"), 600);
    }

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

    text(content.scanLabel, 64, 1220, 660, 64, 38, color("ink"), 600);
    text(content.note, 64, 1302, 660, 92, 28, color("muted"));
    const qr = qrcode(0, "M");
    qr.addData(content.url, "Byte");
    qr.make();
    const count = qr.getModuleCount();
    const cell = Math.floor(232 / (count + 8));
    const side = cell * (count + 8);
    const left = 784 + Math.floor((232 - side) / 2);
    const top = 1184 + Math.floor((232 - side) / 2);
    // QR colors and the four-module quiet zone stay neutral for reliable scanning.
    context.fillStyle = "white";
    context.fillRect(left, top, side, side);
    context.fillStyle = "black";
    for (let row = 0; row < count; row++) {
      for (let column = 0; column < count; column++) {
        if (qr.isDark(row, column))
          context.fillRect(
            left + (column + 4) * cell,
            top + (row + 4) * cell,
            cell,
            cell,
          );
      }
    }
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error("poster_export_failed")),
        "image/png",
      );
    });
    signal.throwIfAborted();
    return { blob, coverFallback: !cover };
  } finally {
    cover?.close();
    logo?.close();
  }
}
