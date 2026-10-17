import * as React from "react";
import { animate as animateValue, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useI18n } from "@/hooks/useI18n";
import {
  getMapPointCandidates,
  projectChina,
  transformMapPoint,
  type MapBounds,
  type MapSelection,
  type MapTransform,
} from "@/lib/china-map";
import type { MapPoint, ProvincePath } from "./use-map-data";
import { MapProvinceOutline } from "./map-province-outline";
import "./map-atlas.css";

const layoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

interface Props {
  paths: ProvincePath[];
  points: MapPoint[];
  counts: Map<string, number>;
  selection: MapSelection;
  camera: MapTransform;
  animate: boolean;
  measuring: boolean;
  onBounds: (bounds: Record<string, MapBounds>) => void;
  onProvince: (name: string) => void;
  onPoints: (points: MapPoint[]) => void;
}

export function MapCanvas({
  paths,
  points,
  counts,
  selection,
  camera,
  animate,
  measuring,
  onBounds,
  onProvince,
  onPoints,
}: Props) {
  const { t } = useI18n(["home", "locations"]);
  const host = React.useRef<HTMLDivElement>(null);
  const cameraRef = React.useRef<SVGGElement>(null);
  const provinceRefs = React.useRef(new Map<string, SVGPathElement>());
  const markerRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const [width, setWidth] = React.useState(0);
  const lastWidth = React.useRef(width);
  const previousProvince = React.useRef(selection.province);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const reduced = useReducedMotion();
  const moving = animate && lastWidth.current === width && !reduced;
  const liveCamera = React.useRef(camera);
  const maxCount = Math.max(1, ...counts.values());
  const selectedPath = paths.find((path) => path.name === selection.province);

  layoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  layoutEffect(() => {
    lastWidth.current = width;
  }, [width]);
  layoutEffect(() => {
    if (!paths.length) return;
    const bounds: Record<string, MapBounds> = {};
    for (const [name, path] of provinceRefs.current) {
      if (typeof path.getBBox !== "function") continue;
      const box = path.getBBox();
      if (box.width > 0 && box.height > 0)
        bounds[name] = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        };
    }
    onBounds(bounds);
  }, [paths, onBounds]);
  layoutEffect(() => {
    const previous = previousProvince.current;
    previousProvince.current = selection.province;
    setHovered(null);
    if (selection.province || !previous) return;
    // Restore after the click's default action and the SVG geometry have committed.
    const frame = window.requestAnimationFrame(() => {
      provinceRefs.current.get(previous)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selection.province, selection.locationId]);

  layoutEffect(() => {
    const from = liveCamera.current;
    const draw = (progress: number) => {
      const value = {
        scale: from.scale + (camera.scale - from.scale) * progress,
        translateX:
          from.translateX + (camera.translateX - from.translateX) * progress,
        translateY:
          from.translateY + (camera.translateY - from.translateY) * progress,
      };
      liveCamera.current = value;
      // One Motion clock writes both layers in the same frame, even after interruption.
      if (cameraRef.current)
        cameraRef.current.style.transform = `matrix(${value.scale},0,0,${value.scale},${value.translateX},${value.translateY})`;
      for (const point of points) {
        if (point.latitude === null || point.longitude === null) continue;
        const element = markerRefs.current.get(point.id)?.parentElement;
        const position = transformMapPoint(
          projectChina(point.latitude, point.longitude),
          value,
        );
        if (element)
          element.style.transform = `translate(${(position.x * width) / 800}px,${(position.y * width) / 800}px)`;
      }
    };
    if (!moving) {
      draw(1);
      return;
    }
    draw(0);
    const animation = animateValue(0, 1, {
      duration: 0.36,
      ease: [0.2, 0, 0, 1],
      onUpdate: draw,
    });
    return () => animation.stop();
  }, [camera, width, moving, points]);

  const choosePoint = (event: React.MouseEvent, point: MapPoint) => {
    if (event.detail === 0) {
      onPoints([point]);
      return;
    }
    // Read the live positions so a click during a camera transition hits what is actually visible.
    const positioned = points
      .filter(
        (candidate) =>
          !selection.province || candidate.provinceName === selection.province,
      )
      .flatMap((candidate) => {
        const element = markerRefs.current.get(candidate.id);
        if (!element) return [];
        const box = element.getBoundingClientRect();
        return [
          { ...candidate, x: box.x + box.width / 2, y: box.y + box.height / 2 },
        ];
      });
    const candidates = getMapPointCandidates(positioned, {
      x: event.clientX,
      y: event.clientY,
    });
    onPoints(candidates.length ? candidates : [point]);
  };

  return (
    <div className="map-atlas-surface">
      <div
        ref={host}
        className="relative mx-auto w-full max-w-4xl overflow-hidden sm:max-w-[min(56rem,calc(60svh*800/620))]"
        onMouseLeave={() => setHovered(null)}
      >
        <svg
          viewBox="0 0 800 620"
          role="group"
          aria-label={
            selection.province
              ? t("home.mapFocusedAriaLabel", { province: selection.province })
              : t("home.mapAriaLabel")
          }
          className="block h-auto w-full select-none"
        >
          <g
            ref={cameraRef}
            data-testid="map-content"
            visibility={measuring ? "hidden" : undefined}
            transform={`matrix(${camera.scale} 0 0 ${camera.scale} ${camera.translateX} ${camera.translateY})`}
            style={{
              transform: `matrix(${camera.scale},0,0,${camera.scale},${camera.translateX},${camera.translateY})`,
            }}
          >
            {paths.map((path) => {
              const count = counts.get(path.name) ?? 0;
              const visible =
                !selection.province || selection.province === path.name;
              return (
                <path
                  key={path.name}
                  ref={(element) => {
                    if (element) provinceRefs.current.set(path.name, element);
                    else provinceRefs.current.delete(path.name);
                  }}
                  data-province={path.name}
                  d={path.d}
                  fill={
                    count
                      ? `color-mix(in oklab, var(--primary) ${18 + (count / maxCount) * 38}%, var(--card))`
                      : "color-mix(in oklab, var(--foreground) 8%, var(--card))"
                  }
                  stroke="color-mix(in oklab, var(--foreground) 24%, var(--card))"
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                  role="button"
                  aria-hidden={!visible}
                  aria-label={path.name}
                  aria-pressed={selection.province === path.name}
                  tabIndex={selection.province ? -1 : 0}
                  className={`map-atlas-province cursor-pointer transition-[fill,opacity] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:stroke-foreground focus-visible:[stroke-width:3] ${visible ? "opacity-100" : "pointer-events-none opacity-10"}`}
                  onClick={() => onProvince(path.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onProvince(path.name);
                    }
                  }}
                >
                  <title>
                    {path.name} · {t("locations.mapProvinceCount", { count })}
                  </title>
                </path>
              );
            })}
            {selectedPath && (
              <MapProvinceOutline
                key={selectedPath.name}
                d={selectedPath.d}
                animate={animate}
                reduced={reduced}
              />
            )}
          </g>
        </svg>
        {points.map((point) => {
          if (point.latitude === null || point.longitude === null) return null;
          const position = transformMapPoint(
            projectChina(point.latitude, point.longitude),
            camera,
          );
          const visible =
            !measuring &&
            (!selection.province || point.provinceName === selection.province);
          const selected = point.id === selection.locationId;
          return (
            <div
              key={point.id}
              aria-hidden={!visible}
              className="absolute left-0 top-0 transition-none"
              style={{
                transform: `translate(${(position.x * width) / 800}px,${(position.y * width) / 800}px)`,
                opacity: visible && width > 0 ? 1 : 0,
                pointerEvents: visible ? "auto" : "none",
                zIndex: selected || hovered === point.id ? 2 : 1,
              }}
            >
              <button
                ref={(element) => {
                  if (element) markerRefs.current.set(point.id, element);
                  else markerRefs.current.delete(point.id);
                }}
                type="button"
                data-map-point={point.id}
                aria-label={point.name}
                aria-pressed={selected}
                disabled={!visible}
                tabIndex={visible ? 0 : -1}
                className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={(event) => choosePoint(event, point)}
                onMouseEnter={() => setHovered(point.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(point.id)}
                onBlur={() => setHovered(null)}
              >
                {selected && animate && !reduced && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute h-7 w-7 rounded-full border border-primary"
                    initial={{ scale: 0.5, opacity: 0.65 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.65, ease: "easeOut" }}
                  />
                )}
                <motion.span
                  initial={false}
                  animate={{
                    scale: !reduced && selected ? 1.25 : 1,
                  }}
                  transition={{ duration: reduced ? 0 : 0.15 }}
                  aria-hidden="true"
                  className={`h-3 w-3 rounded-full border-2 border-background bg-primary shadow-warm-sm transition-[box-shadow,background-color] duration-150 motion-reduce:transition-none ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                />
              </button>
              {(hovered === point.id || selected) && visible && (
                <span
                  aria-hidden="true"
                  style={{ maxWidth: Math.max(0, width / 2 - 12) }}
                  className={`pointer-events-none absolute block w-max truncate rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-warm-sm ${position.x > 400 ? "right-0" : "left-0"} ${(position.y * width) / 800 < 56 ? "top-5" : "bottom-5"}`}
                >
                  {point.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
