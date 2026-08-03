"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { projectChina, PROVINCE_CENTERS } from "@/lib/china-map";
import { fetchAPI } from "@/lib/api";

interface ProvinceStat {
  province: string;
  count: number;
}
interface MapPoint {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
}
interface StatsResponse {
  provinces: ProvinceStat[];
  points: MapPoint[];
}

interface Tooltip {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  href?: string;
}

/** 省份填充色：无地点浅沙米 → 有地点琥珀渐变（对齐 gomate 品牌色） */
function provinceFill(count: number, max: number): string {
  if (count === 0) return "#f2ede7"; // neutral-100
  const t = 0.35 + 0.65 * (count / Math.max(1, max)); // 0.35–1.0
  const l = 0.72 - 0.25 * t; // lightness 随数量加深
  const c = 0.09 + 0.10 * t;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} 58)`;
}

export function ChinaMap({ className }: { className?: string }) {
  const { t } = useI18n(["home", "locations"]);
  const [svgPaths, setSvgPaths] = React.useState<{ name: string; d: string }[]>([]);
  const [stats, setStats] = React.useState<StatsResponse | null>(null);
  const [tooltip, setTooltip] = React.useState<Tooltip | null>(null);
  const [loading, setLoading] = React.useState(true);

  // 加载省份 SVG path（静态资产，避免 bundle 膨胀）
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/maps/china-provinces.svg");
        const svgText = await res.text();
        const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const paths = [...doc.querySelectorAll("path[data-name]")].map((el) => ({
          name: el.getAttribute("data-name") || "",
          d: el.getAttribute("d") || "",
        }));
        if (!cancelled) setSvgPaths(paths.filter((p) => p.name && p.d));
      } catch {
        // 地图加载失败 → 组件留空，不阻断页面
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 加载地点统计
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAPI("/v1/locations/stats");
        const data = (await res.json()) as StatsResponse;
        if (!cancelled) setStats(data);
      } catch {
        // 失败静默：地图无数据时不渲染点
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const provinceCount = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of stats?.provinces ?? []) map.set(p.province, p.count);
    return map;
  }, [stats]);
  const maxCount = Math.max(1, ...(stats?.provinces ?? []).map((p) => p.count));

  const handleProvinceEnter = (name: string) => {
    const center = PROVINCE_CENTERS[name];
    if (!center) return;
    const count = provinceCount.get(name) ?? 0;
    setTooltip({
      x: center.x,
      y: center.y,
      title: name,
      subtitle: count > 0 ? t("locations.mapProvinceCount", { count }) : t("locations.mapNoLocations"),
      href: count > 0 ? `/locations?province=${encodeURIComponent(name)}` : undefined,
    });
  };

  const handlePointEnter = (pt: MapPoint) => {
    const pos = projectChina(pt.lat, pt.lng);
    setTooltip({
      x: pos.x,
      y: pos.y - 10,
      title: pt.name,
      href: `/locations/${pt.slug}`,
    });
  };

  return (
    <div className={className ?? ""}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <svg
          viewBox="0 0 800 620"
          role="img"
          aria-label={t("home.mapAriaLabel")}
          className="block h-auto w-full select-none"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* 省份 */}
          {svgPaths.map((p) => (
            <path
              key={p.name}
              d={p.d}
              fill={provinceFill(provinceCount.get(p.name) ?? 0, maxCount)}
              stroke="#ffffff"
              strokeWidth={0.6}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() => handleProvinceEnter(p.name)}
              onClick={() => {
                const count = provinceCount.get(p.name) ?? 0;
                if (count > 0) {
                  window.location.href = `/locations?province=${encodeURIComponent(p.name)}`;
                }
              }}
            />
          ))}

          {/* 城市点 */}
          {(stats?.points ?? []).map((pt) => {
            const pos = projectChina(pt.lat, pt.lng);
            return (
              <circle
                key={pt.id}
                cx={pos.x}
                cy={pos.y}
                r={5}
                fill="var(--primary)"
                stroke="#fff"
                strokeWidth={1.2}
                className="cursor-pointer"
                onMouseEnter={() => handlePointEnter(pt)}
                onClick={() => {
                  window.location.href = `/locations/${pt.slug}`;
                }}
              />
            );
          })}
        </svg>

        {/* tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-lg"
            style={{
              left: `${(tooltip.x / 800) * 100}%`,
              top: `${(tooltip.y / 620) * 100}%`,
            }}
          >
            <p className="font-semibold">{tooltip.title}</p>
            {tooltip.subtitle && <p className="text-background/70">{tooltip.subtitle}</p>}
          </div>
        )}

        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/50">
            <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
