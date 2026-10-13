import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { getMapPointCandidates, projectChina, transformMapPoint, type MapBounds, type MapSelection, type MapTransform } from "@/lib/china-map";
import type { MapPoint, ProvincePath } from "./use-map-data";

const CAMERA_TRANSITION = "transition-[transform,opacity] duration-[360ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";
const layoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

interface Props {
  paths: ProvincePath[];
  points: MapPoint[];
  counts: Map<string, number>;
  selection: MapSelection;
  camera: MapTransform;
  animate: boolean;
  measuring: boolean;
  returnFocus: string | null;
  onBounds: (bounds: Record<string, MapBounds>) => void;
  onProvince: (name: string) => void;
  onPoints: (points: MapPoint[]) => void;
}

export function MapCanvas({ paths, points, counts, selection, camera, animate, measuring, returnFocus, onBounds, onProvince, onPoints }: Props) {
  const { t } = useI18n(["home", "locations"]);
  const host = React.useRef<HTMLDivElement>(null);
  const provinceRefs = React.useRef(new Map<string, SVGPathElement>());
  const markerRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const [width, setWidth] = React.useState(0);
  const lastWidth = React.useRef(width);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const moving = animate && lastWidth.current === width;
  const maxCount = Math.max(1, ...counts.values());

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
  layoutEffect(() => { lastWidth.current = width; }, [width]);
  layoutEffect(() => {
    if (!paths.length) return;
    const bounds: Record<string, MapBounds> = {};
    for (const [name, path] of provinceRefs.current) {
      if (typeof path.getBBox !== "function") continue;
      const box = path.getBBox();
      if (box.width > 0 && box.height > 0) bounds[name] = { x: box.x, y: box.y, width: box.width, height: box.height };
    }
    onBounds(bounds);
  }, [paths, onBounds]);
  layoutEffect(() => {
    if (!selection.province && returnFocus) provinceRefs.current.get(returnFocus)?.focus({ preventScroll: true });
    setHovered(null);
  }, [selection.province, returnFocus]);

  const choosePoint = (event: React.MouseEvent, point: MapPoint) => {
    if (event.detail === 0) { onPoints([point]); return; }
    // Read the live positions so a click during a camera transition hits what is actually visible.
    const positioned = points.filter(candidate => !selection.province || candidate.provinceName === selection.province).flatMap(candidate => {
      const element = markerRefs.current.get(candidate.id);
      if (!element) return [];
      const box = element.getBoundingClientRect();
      return [{ ...candidate, x: box.x + box.width / 2, y: box.y + box.height / 2 }];
    });
    const candidates = getMapPointCandidates(positioned, { x: event.clientX, y: event.clientY });
    onPoints(candidates.length ? candidates : [point]);
  };

  return (
    <div className="bg-muted/20">
      <div ref={host} className="relative mx-auto w-full max-w-4xl overflow-hidden" onMouseLeave={() => setHovered(null)}>
        <svg viewBox="0 0 800 620" role="group" aria-label={selection.province ? t("home.mapFocusedAriaLabel", { province: selection.province }) : t("home.mapAriaLabel")} className="block h-auto w-full select-none">
          <g data-testid="map-content" visibility={measuring ? "hidden" : undefined}
            transform={`matrix(${camera.scale} 0 0 ${camera.scale} ${camera.translateX} ${camera.translateY})`}
            style={{ transform: `matrix(${camera.scale},0,0,${camera.scale},${camera.translateX},${camera.translateY})` }}
            className={moving ? CAMERA_TRANSITION : undefined}>
            {paths.map(path => {
              const count = counts.get(path.name) ?? 0;
              const visible = !selection.province || selection.province === path.name;
              return <path key={path.name} ref={element => { if (element) provinceRefs.current.set(path.name, element); else provinceRefs.current.delete(path.name); }}
                data-province={path.name} d={path.d}
                fill={count ? `color-mix(in oklab, var(--primary) ${30 + count / maxCount * 65}%, var(--muted))` : "var(--muted)"}
                stroke="var(--background)" strokeWidth={selection.province === path.name ? 1.4 : 0.6} vectorEffect="non-scaling-stroke"
                role="button" aria-label={path.name} aria-pressed={selection.province === path.name} tabIndex={selection.province ? -1 : 0}
                className={`cursor-pointer transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:stroke-foreground focus-visible:[stroke-width:3] ${visible ? "opacity-100 hover:opacity-80" : "pointer-events-none opacity-10"}`}
                onClick={() => onProvince(path.name)}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onProvince(path.name); } }}>
                <title>{path.name} · {t("locations.mapProvinceCount", { count })}</title>
              </path>;
            })}
          </g>
        </svg>
        {points.map(point => {
          if (point.latitude === null || point.longitude === null) return null;
          const position = transformMapPoint(projectChina(point.latitude, point.longitude), camera);
          const visible = !measuring && (!selection.province || point.provinceName === selection.province);
          const selected = point.id === selection.locationId;
          return <div key={point.id} aria-hidden={!visible} className={`absolute left-0 top-0 ${moving ? CAMERA_TRANSITION : ""}`}
            style={{ transform: `translate(${position.x * width / 800}px,${position.y * width / 800}px)`, opacity: visible && width > 0 ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}>
            <button ref={element => { if (element) markerRefs.current.set(point.id, element); else markerRefs.current.delete(point.id); }}
              type="button" data-map-point={point.id} aria-label={point.name} aria-pressed={selected} disabled={!visible} tabIndex={visible ? 0 : -1}
              className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={event => choosePoint(event, point)} onMouseEnter={() => setHovered(point.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(point.id)} onBlur={() => setHovered(null)}>
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full border-2 border-background bg-primary shadow-warm-sm transition-[box-shadow,background-color] duration-150 motion-reduce:transition-none ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`} />
            </button>
          </div>;
        })}
        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-3 bottom-3 hidden rounded-xl bg-card/95 px-3 py-2 text-xs text-foreground shadow-warm-sm transition-opacity duration-150 motion-reduce:transition-none sm:block ${hovered ? "opacity-100" : "opacity-0"}`}>
          {points.find(point => point.id === hovered)?.name || "\u00a0"}
        </div>
      </div>
    </div>
  );
}
